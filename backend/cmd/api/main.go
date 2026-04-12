package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/alexa9795/mindflow/internal/ai"
	"github.com/alexa9795/mindflow/internal/auth"
	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/entry"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/joho/godotenv"
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
	authRepo := auth.NewRepository(db.DB)
	authSvc := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authSvc)

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
		fmt.Fprintf(w, `{"status":"ok","service":"mindflow-api"}`)
	})

	// Auth routes.
	mux.HandleFunc("POST /api/auth/register", middleware.MaxBodySize(authHandler.Register))
	mux.HandleFunc("POST /api/auth/login", middleware.MaxBodySize(authHandler.Login))
	mux.HandleFunc("GET /api/auth/me", middleware.Auth(authHandler.Me))
	mux.HandleFunc("PATCH /api/auth/me", middleware.Auth(middleware.MaxBodySize(authHandler.PatchMe)))
	mux.HandleFunc("DELETE /api/auth/me", middleware.Auth(authHandler.DeleteMe))

	// Entry routes (require auth).
	mux.HandleFunc("POST /api/entries", middleware.Auth(middleware.MaxBodySize(entryHandler.Create)))
	mux.HandleFunc("GET /api/entries", middleware.Auth(entryHandler.List))
	mux.HandleFunc("DELETE /api/entries", middleware.Auth(entryHandler.DeleteAll))
	mux.HandleFunc("GET /api/entries/{id}", middleware.Auth(entryHandler.Get))
	mux.HandleFunc("POST /api/entries/{id}/respond", middleware.Auth(middleware.MaxBodySize(entryHandler.Respond)))
	mux.HandleFunc("POST /api/entries/{id}/messages", middleware.Auth(middleware.MaxBodySize(entryHandler.AddMessage)))

	log.Printf("Echo API starting on port %s", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	// TODO: restrict Access-Control-Allow-Origin before launch
	srv.Handler = middleware.CORS(mux)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
