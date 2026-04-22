package middleware

import (
	"log"
	"net/http"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/subscription"
)

// CheckSubscription enforces the monthly entry limit for free-tier users.
// It must be applied after the Auth middleware so UserIDKey is set.
func CheckSubscription(subSvc *subscription.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok || userID == "" {
				api.WriteError(w, api.ErrUnauthorized)
				return
			}

			status, err := subSvc.CheckSubscription(r.Context(), userID)
			if err != nil {
				log.Printf("subscription check error for user %s: %v", userID, err)
				api.WriteError(w, api.ErrInternalServer)
				return
			}

			if !status.CanPost {
				api.WriteError(w, api.ErrSubscriptionLimit)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
