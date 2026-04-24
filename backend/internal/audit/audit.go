package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
)

// Action is a string identifier for an auditable event.
type Action string

const (
	// Authentication actions.
	ActionLoginSuccess Action = "auth.login.success"
	ActionLoginFailure Action = "auth.login.failure"
	ActionRegister     Action = "auth.register"
	ActionLogout       Action = "auth.logout"
	ActionTokenRevoked Action = "auth.token.revoked"
	ActionRateLimitHit Action = "auth.rate_limit_hit"
	ActionInvalidToken Action = "auth.invalid_token"

	// Account actions.
	ActionUpdateName     Action = "account.update_name"
	ActionUpdateAIToggle Action = "account.update_ai_toggle"
	ActionDeleteAccount  Action = "account.delete"
	ActionDeleteEntries  Action = "account.delete_entries"

	// Subscription actions.
	ActionTrialActivated Action = "subscription.trial_activated"
	ActionTierChanged    Action = "subscription.tier_changed"

	// Data actions.
	ActionDataExport Action = "data.export"
)

// dbExecer is the minimal DB interface needed by Logger. *sql.DB satisfies it.
type dbExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// Logger writes audit events to the audit_events table.
type Logger struct {
	db dbExecer
}

// NewLogger returns a Logger backed by the given *sql.DB.
func NewLogger(db *sql.DB) *Logger {
	return &Logger{db: db}
}

// Log records an audit event asynchronously. It never blocks the caller.
// userID may be nil for unauthenticated events.
//
// NEVER include journal content in metadata — only settings values, flags,
// tier names, and other content-free fields.
func (l *Logger) Log(ctx context.Context, userID *string, action Action, ip string, metadata map[string]any) {
	if l == nil {
		return
	}
	var metaJSON interface{}
	if metadata != nil {
		b, err := json.Marshal(metadata)
		if err != nil {
			slog.Error("audit: failed to marshal metadata", "action", action, "error", err)
			return
		}
		metaJSON = string(b)
	}
	go func() {
		_, err := l.db.ExecContext(context.Background(),
			`INSERT INTO audit_events (user_id, action, ip_address, metadata)
			 VALUES ($1, $2, $3, $4)`,
			userID, string(action), ip, metaJSON,
		)
		if err != nil {
			slog.Error("audit: failed to insert event", "action", action, "error", err)
		}
	}()
}

// IPFromRequest extracts the best-effort client IP from a request.
// Uses the rightmost X-Forwarded-For value (proxy-appended, not spoofable)
// with a fallback to RemoteAddr.
func IPFromRequest(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[len(parts)-1])
		if ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
