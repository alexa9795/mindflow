package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/alexa9795/mindflow/internal/ai"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/auth"
	"github.com/alexa9795/mindflow/internal/config"
	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/email"
	"github.com/alexa9795/mindflow/internal/entry"
	"github.com/alexa9795/mindflow/internal/insights"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/retention"
	"github.com/alexa9795/mindflow/internal/subscription"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	// C1: Read JWT secret once at startup — exits if not set.
	config.InitJWTSecret()

	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file found, using environment variables")
	}

	// H2: Warn if CORS is not locked down for production.
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" || allowedOrigins == "*" {
		slog.Warn("CORS ALLOWED_ORIGINS is not restricted — set it to the production frontend URL before going live")
	}

	if err := db.Connect(); err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer db.DB.Close()

	if err := db.RunMigrations(db.DB); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}

	// Wire up dependencies: repo → service → handler.
	auditLogger := audit.NewLogger(db.DB)

	// Email client is optional — log a warning if not configured.
	emailClient, err := email.NewClient()
	if err != nil {
		slog.Warn("email client not configured, transactional emails disabled", "reason", err)
		emailClient = nil
	}

	subRepo := subscription.NewRepository(db.DB)
	subSvc := subscription.NewService(subRepo)

	// In-memory revocation cache: effective during DB blips on account deletion.
	revokeCache := middleware.NewRevocationCache()

	authRepo := auth.NewRepository(db.DB)
	authSvc := auth.NewService(authRepo, emailClient)
	authHandler := auth.NewHandler(authSvc, subSvc, auditLogger, revokeCache)

	aiSvc := ai.NewService()
	entryRepo := entry.NewRepository(db.DB)
	// authSvc satisfies entry.UserFlags via GetAIEnabled.
	entrySvc := entry.NewService(entryRepo, aiSvc, authSvc)
	entryHandler := entry.NewHandler(entrySvc, auditLogger)

	insightsRepo := insights.NewRepository(db.DB)
	insightsSvc := insights.NewService(insightsRepo)
	insightsHandler := insights.NewHandler(insightsSvc)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Per-IP limiters for auth endpoints — separate maps so different rate
	// limits don't share the same limiter entry for the same IP.
	loginLimiters := &sync.Map{}
	stopLoginEviction := middleware.StartEviction(loginLimiters, 10*time.Minute)
	registerLimiters := &sync.Map{}
	stopRegisterEviction := middleware.StartEviction(registerLimiters, 10*time.Minute)
	// Password reset: 3 requests/hour per IP.
	resetLimiters := &sync.Map{}
	stopResetEviction := middleware.StartEviction(resetLimiters, time.Hour)

	// Per-user limiters for AI endpoints with TTL eviction.
	aiLimiters := middleware.NewAILimiterMap()
	stopAIEviction := middleware.StartEviction(aiLimiters, 10*time.Minute)

	// Auth middleware with token revocation checking via authRepo.
	authMW := middleware.Auth(authRepo, auditLogger, revokeCache)

	loginLimit    := middleware.RateLimitWithMap(loginLimiters, rate.Every(6*time.Second), 3, auditLogger)    // 10 req/min, burst 3
	registerLimit := middleware.RateLimitWithMap(registerLimiters, rate.Every(12*time.Second), 2, auditLogger) // 5 req/min, burst 2
	resetLimit    := middleware.RateLimitWithMap(resetLimiters, rate.Every(20*time.Minute), 3, auditLogger)    // 3 req/hour, burst 3
	aiLimit       := middleware.AIRateLimit(aiLimiters, auditLogger)

	subCheck := middleware.CheckSubscription(subSvc)

	mux := http.NewServeMux()
	mux.Handle("GET /health", middleware.RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := db.DB.PingContext(r.Context()); err != nil {
			slog.Error("health check: database unavailable", "error", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "error", "reason": "database unavailable"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})))

	// Auth routes.
	mux.Handle("POST /api/auth/register", registerLimit(http.HandlerFunc(middleware.MaxBodySize(authHandler.Register))))
	mux.Handle("POST /api/auth/login", loginLimit(http.HandlerFunc(middleware.MaxBodySize(authHandler.Login))))
	mux.HandleFunc("GET /api/auth/me", authMW(authHandler.Me))
	mux.HandleFunc("PATCH /api/auth/me", authMW(middleware.MaxBodySize(authHandler.PatchMe)))
	mux.HandleFunc("DELETE /api/auth/me", authMW(authHandler.DeleteMe))
	mux.HandleFunc("PATCH /api/auth/ai-toggle", authMW(middleware.MaxBodySize(authHandler.AIToggle)))
	mux.HandleFunc("POST /api/subscription/trial", authMW(authHandler.Trial))
	// Refresh token rotation — public (carries its own credential).
	mux.HandleFunc("POST /api/auth/refresh", middleware.MaxBodySize(authHandler.Refresh))
	// Password reset — public, rate-limited.
	mux.Handle("POST /api/auth/reset-password/request",
		resetLimit(http.HandlerFunc(middleware.MaxBodySize(authHandler.RequestPasswordReset))))
	mux.HandleFunc("POST /api/auth/reset-password/confirm",
		middleware.MaxBodySize(authHandler.ConfirmPasswordReset))

	// Entry routes (require auth).
	// POST /api/entries also enforces the subscription limit.
	mux.Handle("POST /api/entries", http.HandlerFunc(authMW(
		http.HandlerFunc(subCheck(middleware.MaxBodySize(entryHandler.Create)).ServeHTTP),
	)))
	mux.HandleFunc("GET /api/entries", authMW(entryHandler.List))
	mux.HandleFunc("GET /api/export", authMW(entryHandler.Export))
	mux.HandleFunc("DELETE /api/entries", authMW(entryHandler.DeleteAll))
	mux.HandleFunc("GET /api/entries/{id}", authMW(entryHandler.Get))
	// AI endpoints — also rate-limited per user.
	mux.Handle("POST /api/entries/{id}/respond",
		http.HandlerFunc(authMW(
			http.HandlerFunc(aiLimit(middleware.MaxBodySize(entryHandler.Respond)).ServeHTTP),
		)))
	mux.Handle("POST /api/entries/{id}/messages",
		http.HandlerFunc(authMW(
			http.HandlerFunc(aiLimit(http.HandlerFunc(middleware.MaxBodySize(entryHandler.AddMessage))).ServeHTTP),
		)))

	// Insights route.
	mux.HandleFunc("GET /api/insights", authMW(insightsHandler.GetInsights))

	// Shutdown context — used to stop background jobs cleanly.
	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

	// Retention job: scans inactive accounts daily.
	retention.StartRetentionJob(appCtx, retention.NewJob(db.DB, auditLogger, emailClient))

	// Background job: clean up expired revoked token entries every hour.
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-appCtx.Done():
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				if _, err := db.DB.ExecContext(ctx, `DELETE FROM revoked_tokens WHERE expires_at < NOW()`); err != nil {
					slog.Error("failed to clean revoked tokens", "error", err)
				}
				cancel()
				revokeCache.Cleanup()
			}
		}
	}()

	slog.Info("Echo API starting", "port", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      middleware.RequestID(middleware.SecurityHeaders(middleware.CORS(mux))),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 90 * time.Second, // L1: raised for long AI responses
		IdleTimeout:  120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	slog.Info("server ready, waiting for shutdown signal")
	<-quit
	slog.Info("shutdown signal received, draining connections")

	// Stop eviction goroutines.
	stopLoginEviction()
	stopRegisterEviction()
	stopResetEviction()
	stopAIEviction()
	appCancel()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}

	// Drain audit queue before closing DB.
	auditLogger.Shutdown()
	slog.Info("server stopped")
}
