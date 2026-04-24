package retention

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/email"
)

// Job scans for inactive accounts and takes retention actions:
// warnings at 11 months, final warnings at 11.5 months, deletion at 12 months.
// Tester accounts are never affected.
type Job struct {
	db          *sql.DB
	auditLogger *audit.Logger
	emailClient *email.Client
}

// NewJob creates a retention Job.
func NewJob(db *sql.DB, auditLogger *audit.Logger, emailClient *email.Client) *Job {
	return &Job{db: db, auditLogger: auditLogger, emailClient: emailClient}
}

// Run executes one retention scan with three phases:
// 1. Final warnings (11.5 months inactive, not yet final-warned)
// 2. First warnings (11 months inactive, not yet warned)
// 3. Deletions (12 months inactive, final warning already sent)
func (j *Job) Run(ctx context.Context) {
	j.runFinalWarnings(ctx)
	j.runFirstWarnings(ctx)
	j.runDeletions(ctx)
}

func (j *Job) runFinalWarnings(ctx context.Context) {
	rows, err := j.db.QueryContext(ctx, `
		SELECT id, email, name FROM users
		WHERE last_active_at < NOW() - INTERVAL '11 months 15 days'
		  AND last_active_at >= NOW() - INTERVAL '12 months'
		  AND final_warned_at IS NULL
		  AND subscription_type != 'tester'`)
	if err != nil {
		slog.Error("retention: failed to query final-warning accounts", "error", err)
		return
	}

	type row struct {
		id, email, name string
	}
	var accounts []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.email, &r.name); err != nil {
			slog.Error("retention: scan error (final warning)", "error", err)
		} else {
			accounts = append(accounts, r)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		slog.Error("retention: row iteration error (final warning)", "error", err)
		return
	}

	for _, a := range accounts {
		if j.emailClient != nil {
			if err := j.emailClient.SendFinalRetentionWarning(ctx, a.email, a.name); err != nil {
				slog.Warn("retention: failed to send final warning email", "user_id", a.id, "error", err)
			}
		}
		if _, err := j.db.ExecContext(ctx,
			`UPDATE users SET final_warned_at = NOW() WHERE id = $1`, a.id,
		); err != nil {
			slog.Error("retention: failed to update final_warned_at", "user_id", a.id, "error", err)
		}
		j.auditLogger.Log(ctx, &a.id, audit.ActionRetentionFinalWarning, "", nil)
		slog.Info("retention.final_warning_sent", "user_id", a.id)
	}
}

func (j *Job) runFirstWarnings(ctx context.Context) {
	rows, err := j.db.QueryContext(ctx, `
		SELECT id, email, name FROM users
		WHERE last_active_at < NOW() - INTERVAL '11 months'
		  AND last_active_at >= NOW() - INTERVAL '11 months 15 days'
		  AND warned_at IS NULL
		  AND subscription_type != 'tester'`)
	if err != nil {
		slog.Error("retention: failed to query first-warning accounts", "error", err)
		return
	}

	type row struct {
		id, email, name string
	}
	var accounts []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.email, &r.name); err != nil {
			slog.Error("retention: scan error (first warning)", "error", err)
		} else {
			accounts = append(accounts, r)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		slog.Error("retention: row iteration error (first warning)", "error", err)
		return
	}

	for _, a := range accounts {
		if j.emailClient != nil {
			// 30 days until final warning (~15 days from now to 12-month mark minus 15 days).
			// Use a conservative estimate for the email message.
			const daysUntilDeletion = 45
			if err := j.emailClient.SendRetentionWarning(ctx, a.email, a.name, daysUntilDeletion); err != nil {
				slog.Warn("retention: failed to send first warning email", "user_id", a.id, "error", err)
			}
		}
		if _, err := j.db.ExecContext(ctx,
			`UPDATE users SET warned_at = NOW() WHERE id = $1`, a.id,
		); err != nil {
			slog.Error("retention: failed to update warned_at", "user_id", a.id, "error", err)
		}
		j.auditLogger.Log(ctx, &a.id, audit.ActionRetentionWarning, "", nil)
		slog.Info("retention.warning_sent", "user_id", a.id)
	}
}

func (j *Job) runDeletions(ctx context.Context) {
	rows, err := j.db.QueryContext(ctx, `
		SELECT id FROM users
		WHERE last_active_at < NOW() - INTERVAL '12 months'
		  AND final_warned_at IS NOT NULL
		  AND subscription_type != 'tester'`)
	if err != nil {
		slog.Error("retention: failed to query deletion-threshold accounts", "error", err)
		return
	}

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			slog.Error("retention: scan error (deletion)", "error", err)
		} else {
			ids = append(ids, id)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		slog.Error("retention: row iteration error (deletion)", "error", err)
		return
	}

	for _, id := range ids {
		localID := id
		// Anonymize audit records before deleting (user_id FK must still be valid).
		if _, err := j.db.ExecContext(ctx,
			`UPDATE audit_events SET ip_address = NULL, metadata = metadata - 'ip' - 'email'
			 WHERE user_id = $1`, localID,
		); err != nil {
			slog.Error("retention: failed to anonymize audit records", "user_id", localID, "error", err)
		}
		if _, err := j.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, localID); err != nil {
			slog.Error("retention: failed to delete inactive account", "user_id", localID, "error", err)
			continue
		}
		j.auditLogger.Log(ctx, nil, audit.ActionRetentionDeleted, "",
			map[string]any{"deleted_user_id": localID})
		slog.Info("retention.account_deleted", "user_id", localID)
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
