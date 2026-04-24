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
	"github.com/alexa9795/mindflow/internal/db"
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

	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file found, using environment variables")
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

	subRepo := subscription.NewRepository(db.DB)
	subSvc := subscription.NewService(subRepo)

	authRepo := auth.NewRepository(db.DB)
	authSvc := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authSvc, subSvc, auditLogger)

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
	middleware.StartEviction(loginLimiters, 10*time.Minute)
	registerLimiters := &sync.Map{}
	middleware.StartEviction(registerLimiters, 10*time.Minute)

	// Per-user limiters for AI endpoints with TTL eviction.
	aiLimiters := middleware.NewAILimiterMap()
	middleware.StartEviction(aiLimiters, 10*time.Minute)

	// Auth middleware with token revocation checking via authRepo.
	authMW := middleware.Auth(authRepo, auditLogger)

	loginLimit    := middleware.RateLimitWithMap(loginLimiters, rate.Every(6*time.Second), 3, auditLogger)   // 10 req/min, burst 3
	registerLimit := middleware.RateLimitWithMap(registerLimiters, rate.Every(12*time.Second), 2, auditLogger) // 5 req/min, burst 2
	aiLimit := middleware.AIRateLimit(aiLimiters)

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

	// Retention job: detect inactive accounts daily (Phase 1 — log only).
	retention.StartRetentionJob(appCtx, retention.NewJob(db.DB, auditLogger))

	// Background job: clean up expired revoked token entries every hour.
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			if _, err := db.DB.ExecContext(ctx, `DELETE FROM revoked_tokens WHERE expires_at < NOW()`); err != nil {
				slog.Error("failed to clean revoked tokens", "error", err)
			}
			cancel()
		}
	}()

	slog.Info("Echo API starting", "port", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      middleware.RequestID(middleware.SecurityHeaders(middleware.CORS(mux))),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
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

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
	slog.Info("server stopped")
}
