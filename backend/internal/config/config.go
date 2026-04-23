package config

import (
	"log"
	"os"
)

// JWTSecret returns the JWT signing secret from the environment.
// The server will not start if JWT_SECRET is unset.
func JWTSecret() string {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		log.Fatal("JWT_SECRET environment variable is required — server will not start without it")
	}
	return s
}
