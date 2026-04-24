package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey      contextKey = "userID"
	JTIKey         contextKey = "jti"
	TokenExpiryKey contextKey = "tokenExpiry"
)

// TokenRevocationChecker can verify whether a JWT has been explicitly revoked.
// Implemented by auth.Repository so the middleware can check the revoked_tokens table.
type TokenRevocationChecker interface {
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
}

// Auth returns a handler wrapper that validates Bearer JWTs, checks token
// revocation, and stores userID / jti / tokenExpiry in the request context.
//
// Token revocation is only applied on explicit account deletion; normal logout
// is client-side only (token discarded from SecureStore). If the revocation
// check itself fails (e.g. DB unavailable), the request is allowed through
// with a warning — a DB outage should not log out all active users, and a
// deleted user's token expires within 24 h regardless.
func Auth(checker TokenRevocationChecker, auditLogger *audit.Logger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				api.WriteError(w, api.ErrUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			ip := audit.IPFromRequest(r)

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(config.JWTSecret()), nil
			})
			if err != nil || !token.Valid {
				auditLogger.Log(r.Context(), nil, audit.ActionInvalidToken, ip, nil)
				api.WriteError(w, api.ErrUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				auditLogger.Log(r.Context(), nil, audit.ActionInvalidToken, ip, nil)
				api.WriteError(w, api.ErrUnauthorized)
				return
			}

			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				auditLogger.Log(r.Context(), nil, audit.ActionInvalidToken, ip, nil)
				api.WriteError(w, api.ErrUnauthorized)
				return
			}

			jti, _ := claims["jti"].(string)

			// Check token revocation (used for account deletion).
			if jti != "" {
				revoked, err := checker.IsTokenRevoked(r.Context(), jti)
				if err != nil {
					slog.Warn("token revocation check failed, allowing request",
						"jti", jti, "error", err)
				} else if revoked {
					auditLogger.Log(r.Context(), &userID, audit.ActionTokenRevoked, ip,
						map[string]any{"jti": jti})
					api.WriteError(w, api.ErrUnauthorized)
					return
				}
			}

			// Store expiry so handlers (e.g. DeleteMe) can pass it to RevokeToken.
			var expiry time.Time
			if exp, ok := claims["exp"].(float64); ok {
				expiry = time.Unix(int64(exp), 0)
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, JTIKey, jti)
			ctx = context.WithValue(ctx, TokenExpiryKey, expiry)
			next(w, r.WithContext(ctx))
		}
	}
}
