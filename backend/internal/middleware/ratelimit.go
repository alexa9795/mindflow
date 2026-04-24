package middleware

import (
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"golang.org/x/time/rate"
)

// limiterEntry wraps a rate.Limiter with a last-seen timestamp for TTL eviction.
// lastSeen is stored as Unix nanoseconds via atomic.Int64 to avoid data races
// when multiple goroutines touch the same entry concurrently.
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen atomic.Int64 // Unix nanoseconds; use .Store/.Load
}

// StartEviction launches a goroutine that removes entries from m that have not
// been seen for longer than ttl. It returns a stop function; call it during
// graceful shutdown to release the goroutine.
func StartEviction(m *sync.Map, ttl time.Duration) (stop func()) {
	ch := make(chan struct{})
	go func() {
		ticker := time.NewTicker(ttl / 2)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				cutoff := time.Now().Add(-ttl)
				m.Range(func(k, v any) bool {
					if time.Unix(0, v.(*limiterEntry).lastSeen.Load()).Before(cutoff) {
						m.Delete(k)
					}
					return true
				})
			case <-ch:
				return
			}
		}
	}()
	return func() { close(ch) }
}

// RateLimitWithMap returns a per-IP rate-limiting middleware using the provided
// sync.Map. Callers are responsible for calling StartEviction on the map.
// auditLogger may be nil (no audit events emitted).
func RateLimitWithMap(m *sync.Map, rps rate.Limit, burst int, auditLogger *audit.Logger) func(http.Handler) http.Handler {
	getLimiter := func(ip string) *rate.Limiter {
		e := &limiterEntry{limiter: rate.NewLimiter(rps, burst)}
		e.lastSeen.Store(time.Now().UnixNano())
		actual, _ := m.LoadOrStore(ip, e)
		got := actual.(*limiterEntry)
		got.lastSeen.Store(time.Now().UnixNano())
		return got.limiter
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := audit.IPFromRequest(r)
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
