package middleware

import (
	"net/http"
	"os"
	"strings"
)

// CORS applies cross-origin headers based on the ALLOWED_ORIGINS env var.
//
// Rules:
//   - Empty or "null" Origin (React Native / Expo mobile requests) → always allowed.
//   - ALLOWED_ORIGINS="*" → allow all (dev convenience only).
//   - Otherwise ALLOWED_ORIGINS is a comma-separated list of allowed origins;
//     only matching origins receive the ACAO header.
//
// Set ALLOWED_ORIGINS to your Railway backend URL in production.
// Mobile app requests have no Origin header and are always allowed.
func CORS(next http.Handler) http.Handler {
	rawAllowed := os.Getenv("ALLOWED_ORIGINS")
	allowed := parseAllowedOrigins(rawAllowed)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if originAllowed(origin, rawAllowed, allowed) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func parseAllowedOrigins(raw string) map[string]struct{} {
	m := make(map[string]struct{})
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			m[o] = struct{}{}
		}
	}
	return m
}

func originAllowed(origin, rawAllowed string, allowed map[string]struct{}) bool {
	// Mobile app (React Native / Expo) sends no Origin — always allow.
	if origin == "" || origin == "null" {
		return true
	}
	// Wildcard — dev convenience.
	if rawAllowed == "*" {
		return true
	}
	_, ok := allowed[origin]
	return ok
}
