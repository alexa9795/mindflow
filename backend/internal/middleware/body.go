package middleware

import "net/http"

// MaxBodySize wraps a handler and limits the request body to 1MB.
// Prevents unbounded reads across all endpoints.
func MaxBodySize(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB
		next(w, r)
	}
}
