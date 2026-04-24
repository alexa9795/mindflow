package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Action is a string identifier for an auditable event.
type Action string

const (
	// Authentication actions.
	ActionLoginSuccess Action = "auth.login.success"
	ActionLoginFailure Action = "auth.login.failure"
	ActionRegister     Action = "auth.register"
	// ActionLogout is intentionally never emitted server-side.
	// Logout is client-side only (token discarded from SecureStore).
	// No server-side session exists beyond the token TTL.
	// Refresh token revocation IS audited (token.revoked action covers this).
	ActionLogout       Action = "auth.logout"
	ActionTokenRevoked   Action = "auth.token.revoked"
	ActionTokenRefreshed Action = "auth.token.refreshed"
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

	// Retention actions.
	ActionRetentionFlagged      Action = "retention.flagged"
	ActionRetentionWarning      Action = "retention.warning_sent"
	ActionRetentionFinalWarning Action = "retention.final_warning_sent"
	ActionRetentionDeleted      Action = "retention.account_deleted"

	// AI actions.
	ActionAIRateLimitHit Action = "ai.rate_limit_hit"
)

type auditEvent struct {
	userID   *string
	action   Action
	ip       string
	metadata map[string]any
}

// dbExecer is the minimal DB interface needed by Logger. *sql.DB satisfies it.
type dbExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// Logger writes audit events to the audit_events table via a bounded worker pool.
type Logger struct {
	db    dbExecer
	queue chan auditEvent
	wg    sync.WaitGroup
}

// newLogger is the internal constructor used by both NewLogger and tests.
func newLogger(db dbExecer) *Logger {
	l := &Logger{
		db:    db,
		queue: make(chan auditEvent, 500),
	}
	for i := 0; i < 3; i++ {
		l.wg.Add(1)
		go l.worker()
	}
	return l
}

// NewLogger returns a Logger backed by the given *sql.DB.
func NewLogger(db *sql.DB) *Logger {
	return newLogger(db)
}

func (l *Logger) worker() {
	defer l.wg.Done()
	for event := range l.queue {
		var metaJSON interface{}
		if event.metadata != nil {
			b, err := json.Marshal(event.metadata)
			if err != nil {
				slog.Error("audit: failed to marshal metadata", "action", event.action, "error", err)
				continue
			}
			metaJSON = string(b)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := l.db.ExecContext(ctx,
			`INSERT INTO audit_events (user_id, action, ip_address, metadata)
			 VALUES ($1, $2, $3, $4)`,
			event.userID, string(event.action), event.ip, metaJSON,
		)
		cancel()
		if err != nil {
			slog.Error("audit: failed to insert event", "action", event.action, "error", err)
		}
	}
}

// Log records an audit event asynchronously. It never blocks the caller.
// If the queue is full, the event is dropped with a warning.
// userID may be nil for unauthenticated events.
//
// NEVER include journal content in metadata — only settings values, flags,
// tier names, and other content-free fields.
func (l *Logger) Log(ctx context.Context, userID *string, action Action, ip string, metadata map[string]any) {
	if l == nil {
		return
	}
	select {
	case l.queue <- auditEvent{userID: userID, action: action, ip: ip, metadata: metadata}:
	default:
		slog.Warn("audit.queue_full — event dropped", "action", action)
	}
}

// Shutdown drains the queue and waits for all in-flight inserts to complete.
// Call before db.Close() in graceful shutdown.
func (l *Logger) Shutdown() {
	if l == nil {
		return
	}
	close(l.queue)
	l.wg.Wait()
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
