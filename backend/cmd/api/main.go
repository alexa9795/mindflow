package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

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

	// Auth routes
	mux.HandleFunc("/api/auth/register", auth.Register)
	mux.HandleFunc("/api/auth/login", auth.Login)

	// Entry routes (require auth)
	mux.HandleFunc("POST /api/entries", middleware.Auth(entry.Create))
	mux.HandleFunc("GET /api/entries", middleware.Auth(entry.List))
	mux.HandleFunc("GET /api/entries/{id}", middleware.Auth(entry.Get))
	mux.HandleFunc("POST /api/entries/{id}/respond", middleware.Auth(entry.Respond))
	mux.HandleFunc("POST /api/entries/{id}/messages", middleware.Auth(entry.AddMessage))

	log.Printf("MindFlow API starting on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
