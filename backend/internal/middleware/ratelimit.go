package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"golang.org/x/time/rate"
)

// limiterEntry wraps a rate.Limiter with a last-seen timestamp for TTL eviction.
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// StartEviction launches a goroutine that removes entries from m that have not
// been seen for longer than ttl. It ticks at ttl/2.
func StartEviction(m *sync.Map, ttl time.Duration) {
	go func() {
		ticker := time.NewTicker(ttl / 2)
		defer ticker.Stop()
		for range ticker.C {
			cutoff := time.Now().Add(-ttl)
			m.Range(func(k, v any) bool {
				if v.(*limiterEntry).lastSeen.Before(cutoff) {
					m.Delete(k)
				}
				return true
			})
		}
	}()
}

// RateLimitWithMap returns a per-IP rate-limiting middleware using the provided
// sync.Map. Callers are responsible for calling StartEviction on the map.
// auditLogger may be nil (no audit events emitted).
func RateLimitWithMap(m *sync.Map, rps rate.Limit, burst int, auditLogger *audit.Logger) func(http.Handler) http.Handler {
	getLimiter := func(ip string) *rate.Limiter {
		e := &limiterEntry{limiter: rate.NewLimiter(rps, burst), lastSeen: time.Now()}
		actual, _ := m.LoadOrStore(ip, e)
		got := actual.(*limiterEntry)
		got.lastSeen = time.Now()
		return got.limiter
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			if !getLimiter(ip).Allow() {
				auditLogger.Log(r.Context(), nil, audit.ActionRateLimitHit, ip,
					map[string]any{"path": r.URL.Path})
				api.WriteError(w, api.ErrRateLimited)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RateLimit returns a per-IP rate-limiting middleware with its own internal map.
// For production use, prefer RateLimitWithMap + StartEviction to prevent memory growth.
func RateLimit(rps rate.Limit, burst int) func(http.Handler) http.Handler {
	var m sync.Map
	return RateLimitWithMap(&m, rps, burst, nil)
}

// clientIP extracts the best-effort client IP.
//
// On Railway (and similar proxies), the rightmost value in X-Forwarded-For is
// the IP appended by the trusted proxy — it cannot be spoofed by the client.
// Taking the FIRST value (the common default) allows a client to inject a fake
// IP and bypass per-IP limiting.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[len(parts)-1])
		if ip != "" {
			return ip
		}
	}
	// Fall back to direct connection address.
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
