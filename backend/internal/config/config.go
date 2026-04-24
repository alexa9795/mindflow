package config

import (
	"log/slog"
	"os"
)

var jwtSecret string

// InitJWTSecret reads and caches JWT_SECRET from the environment.
// Exits the process if the variable is not set — must be called at startup.
func InitJWTSecret() {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		slog.Error("JWT_SECRET environment variable is required — server will not start without it")
		os.Exit(1)
	}
	jwtSecret = s
}

// JWTSecret returns the cached JWT signing secret.
// Panics if InitJWTSecret was not called first.
func JWTSecret() string {
	return jwtSecret
}
