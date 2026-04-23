package middleware

import (
	"net"
	"net/http"
	"sync"

	"github.com/alexa9795/mindflow/internal/api"
	"golang.org/x/time/rate"
)

// RateLimit returns a per-IP rate-limiting middleware.
// rps controls the steady-state token refill rate; burst controls the
// maximum tokens available at once (allows short bursts above rps).
func RateLimit(rps rate.Limit, burst int) func(http.Handler) http.Handler {
	var limiters sync.Map

	getLimiter := func(ip string) *rate.Limiter {
		if v, ok := limiters.Load(ip); ok {
			return v.(*rate.Limiter)
		}
		l := rate.NewLimiter(rps, burst)
		limiters.Store(ip, l)
		return l
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			if !getLimiter(ip).Allow() {
				api.WriteError(w, api.ErrRateLimited)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// clientIP returns the best-effort client IP, preferring X-Forwarded-For
// (set by Railway's proxy) and falling back to RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For may be "client, proxy1, proxy2" — take the first.
		if i := len(xff); i > 0 {
			for j := 0; j < i; j++ {
				if xff[j] == ',' {
					return xff[:j]
				}
			}
			return xff
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
