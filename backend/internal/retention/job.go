package retention

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/alexa9795/mindflow/internal/audit"
)

const (
	// InactivityWarningThreshold is the age at which an account enters the
	// pre-deletion warning window (~11 months).
	InactivityWarningThreshold = 11 * 30 * 24 * time.Hour

	// InactivityDeleteThreshold is the age at which an account is flagged for
	// deletion (~12 months). Phase 1 logs only — no automatic deletion.
	InactivityDeleteThreshold = 12 * 30 * 24 * time.Hour
)

// Job scans for inactive accounts and logs them. It never auto-deletes.
// Phase 2 will add email warnings and a grace-period auto-delete.
type Job struct {
	db          *sql.DB
	auditLogger *audit.Logger
}

// NewJob creates a retention Job.
func NewJob(db *sql.DB, auditLogger *audit.Logger) *Job {
	return &Job{db: db, auditLogger: auditLogger}
}

// Run executes one retention scan. It queries for accounts that have crossed
// the deletion threshold and the warning threshold, and logs them.
// Tester accounts are never flagged.
func (j *Job) Run(ctx context.Context) {
	// Accounts that have crossed the deletion threshold (~12 months).
	rows, err := j.db.QueryContext(ctx, `
		SELECT id, last_active_at FROM users
		WHERE last_active_at < NOW() - INTERVAL '12 months'
		AND subscription_type != 'tester'`)
	if err != nil {
		slog.Error("retention: failed to query inactive accounts", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var lastActive time.Time
		if err := rows.Scan(&id, &lastActive); err != nil {
			slog.Error("retention: scan error", "error", err)
			continue
		}
		// Log user_id only — never email (GDPR).
		slog.Warn("retention.inactive_account_found",
			"user_id", id,
			"inactive_since", lastActive,
		)
		// TODO Phase 2: send warning email and auto-delete after grace period.
	}
	if err := rows.Err(); err != nil {
		slog.Error("retention: row iteration error (delete threshold)", "error", err)
	}

	// Accounts approaching the warning threshold (11–12 months inactive).
	warnRows, err := j.db.QueryContext(ctx, `
		SELECT id FROM users
		WHERE last_active_at < NOW() - INTERVAL '11 months'
		AND last_active_at >= NOW() - INTERVAL '12 months'
		AND subscription_type != 'tester'`)
	if err != nil {
		slog.Error("retention: failed to query warning-threshold accounts", "error", err)
		return
	}
	defer warnRows.Close()

	for warnRows.Next() {
		var id string
		if err := warnRows.Scan(&id); err != nil {
			slog.Error("retention: scan error", "error", err)
			continue
		}
		slog.Info("retention.warning_threshold_reached", "user_id", id)
	}
	if err := warnRows.Err(); err != nil {
		slog.Error("retention: row iteration error (warning threshold)", "error", err)
	}
}

// StartRetentionJob runs the job once at startup then every 24 hours.
// It stops when ctx is cancelled.
func StartRetentionJob(ctx context.Context, job *Job) {
	go func() {
		job.Run(ctx)
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				job.Run(ctx)
			}
		}
	}()
}

// shouldFlag returns whether an account should trigger a warning or deletion
// alert based on its last activity and subscription type.
// Extracted for testability.
func shouldFlag(lastActive time.Time, subType string, now time.Time) (atWarning, atDelete bool) {
	if subType == "tester" {
		return false, false
	}
	age := now.Sub(lastActive)
	atWarning = age >= InactivityWarningThreshold && age < InactivityDeleteThreshold
	atDelete = age >= InactivityDeleteThreshold
	return
}
