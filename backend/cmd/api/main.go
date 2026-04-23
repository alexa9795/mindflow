package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/alexa9795/mindflow/internal/ai"
	"github.com/alexa9795/mindflow/internal/auth"
	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/entry"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/subscription"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	if err := db.Connect(); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.DB.Close()

	if err := db.RunMigrations(db.DB); err != nil {
		log.Fatalf("Migrations failed: %v", err)
	}

	// Wire up dependencies: repo → service → handler.
	subRepo := subscription.NewRepository(db.DB)
	subSvc := subscription.NewService(subRepo)

	authRepo := auth.NewRepository(db.DB)
	authSvc := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authSvc, subSvc)

	aiSvc := ai.NewService()
	entryRepo := entry.NewRepository(db.DB)
	entrySvc := entry.NewService(entryRepo, aiSvc)
	entryHandler := entry.NewHandler(entrySvc)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		env := os.Getenv("ENV")
		if env == "" {
			env = "development"
		}
		fmt.Fprintf(w, `{"status":"ok","env":"%s"}`, env)
	})

	subCheck := middleware.CheckSubscription(subSvc)

	// Per-IP rate limiters for auth endpoints.
	loginLimit    := middleware.RateLimit(rate.Every(6*time.Second), 3)  // 10 req/min, burst 3
	registerLimit := middleware.RateLimit(rate.Every(12*time.Second), 2) // 5 req/min, burst 2

	// Auth routes.
	mux.Handle("POST /api/auth/register", registerLimit(http.HandlerFunc(middleware.MaxBodySize(authHandler.Register))))
	mux.Handle("POST /api/auth/login", loginLimit(http.HandlerFunc(middleware.MaxBodySize(authHandler.Login))))
	mux.HandleFunc("GET /api/auth/me", middleware.Auth(authHandler.Me))
	mux.HandleFunc("PATCH /api/auth/me", middleware.Auth(middleware.MaxBodySize(authHandler.PatchMe)))
	mux.HandleFunc("DELETE /api/auth/me", middleware.Auth(authHandler.DeleteMe))
	mux.HandleFunc("POST /api/subscription/trial", middleware.Auth(authHandler.Trial))

	// Entry routes (require auth).
	// POST /api/entries also enforces the subscription limit.
	mux.Handle("POST /api/entries", middleware.Auth(
		http.HandlerFunc(subCheck(middleware.MaxBodySize(entryHandler.Create)).ServeHTTP),
	))
	mux.HandleFunc("GET /api/entries", middleware.Auth(entryHandler.List))
	mux.HandleFunc("DELETE /api/entries", middleware.Auth(entryHandler.DeleteAll))
	mux.HandleFunc("GET /api/entries/{id}", middleware.Auth(entryHandler.Get))
	mux.HandleFunc("POST /api/entries/{id}/respond", middleware.Auth(middleware.MaxBodySize(entryHandler.Respond)))
	mux.HandleFunc("POST /api/entries/{id}/messages", middleware.Auth(middleware.MaxBodySize(entryHandler.AddMessage)))

	log.Printf("Echo API starting on port %s", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      middleware.SecurityHeaders(middleware.CORS(mux)),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	log.Println("Server ready, waiting for shutdown signal")
	<-quit
	log.Println("Shutdown signal received, draining connections...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown failed: %v", err)
	}
	log.Println("Server stopped")
}
