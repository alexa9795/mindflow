package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"golang.org/x/time/rate"
)

// AIRateLimit returns a per-user rate-limiting middleware for AI-calling endpoints.
// Limit: 10 AI calls per minute per user, burst 3.
// Uses the same LoadOrStore + TTL eviction pattern as RateLimit.
func AIRateLimit(limiters *sync.Map, auditLogger *audit.Logger) func(http.Handler) http.Handler {
	const (
		rps   = rate.Limit(10.0 / 60.0) // 10 per minute
		burst = 3
	)

	getAILimiter := func(userID string) *rate.Limiter {
		e := &limiterEntry{limiter: rate.NewLimiter(rps, burst)}
		e.lastSeen.Store(time.Now().UnixNano())
		actual, _ := limiters.LoadOrStore(userID, e)
		got := actual.(*limiterEntry)
		got.lastSeen.Store(time.Now().UnixNano())
		return got.limiter
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, _ := r.Context().Value(UserIDKey).(string)
			if userID == "" {
				// Auth middleware would have already rejected unauthenticated requests;
				// this is a defence-in-depth fallback.
				api.WriteError(w, api.ErrUnauthorized)
				return
			}
			if !getAILimiter(userID).Allow() {
				auditLogger.Log(r.Context(), &userID, audit.ActionAIRateLimitHit,
					audit.IPFromRequest(r), nil)
				api.WriteError(w, api.ErrAIRateLimited)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// NewAILimiterMap returns a sync.Map for the AI rate limiter.
// Pass it to both AIRateLimit and StartEviction.
func NewAILimiterMap() *sync.Map { return &sync.Map{} }
