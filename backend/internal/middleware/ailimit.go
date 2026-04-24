package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/alexa9795/mindflow/internal/api"
	"golang.org/x/time/rate"
)

// AIRateLimit returns a per-user rate-limiting middleware for AI-calling endpoints.
// Limit: 10 AI calls per minute per user, burst 3.
// Uses the same LoadOrStore + TTL eviction pattern as RateLimit.
func AIRateLimit(limiters *sync.Map) func(http.Handler) http.Handler {
	const (
		rps   = rate.Limit(10.0 / 60.0) // 10 per minute
		burst = 3
	)

	getAILimiter := func(userID string) *rate.Limiter {
		e := &limiterEntry{limiter: rate.NewLimiter(rps, burst), lastSeen: time.Now()}
		actual, _ := limiters.LoadOrStore(userID, e)
		got := actual.(*limiterEntry)
		got.lastSeen = time.Now()
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
				api.WriteError(w, api.ErrAIRateLimited)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// NewAILimiterMap returns a sync.Map for the AI rate limiter.
// Pass it to both AIRateLimit and startEviction.
func NewAILimiterMap() *sync.Map { return &sync.Map{} }
