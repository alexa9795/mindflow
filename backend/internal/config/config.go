package config

import "os"

// JWTSecret returns the JWT signing secret.
// Falls back to a dev-only default — never use in production.
func JWTSecret() string {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return s
	}
	return "dev_secret_change_in_production"
}
