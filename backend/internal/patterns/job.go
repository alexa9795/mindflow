package patterns

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"
)

// Job computes statistical patterns for all active users on a weekly schedule.
type Job struct {
	db     *sql.DB
	logger *slog.Logger
}

// NewJob creates a pattern Job.
func NewJob(db *sql.DB, logger *slog.Logger) *Job {
	return &Job{db: db, logger: logger}
}

// Run processes all users who have at least 5 entries in the last 90 days.
// It is cancellable via ctx.
func (j *Job) Run(ctx context.Context) error {
	start := time.Now()

	rows, err := j.db.QueryContext(ctx, `
		SELECT user_id
		FROM entries
		WHERE created_at > NOW() - INTERVAL '90 days'
		GROUP BY user_id
		HAVING COUNT(*) >= 5`)
	if err != nil {
		return fmt.Errorf("patterns job: query active users: %w", err)
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			j.logger.Error("patterns job: scan user id", "error", err)
			continue
		}
		userIDs = append(userIDs, id)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("patterns job: iterate users: %w", err)
	}

	processed := 0
	for _, userID := range userIDs {
		if ctx.Err() != nil {
			break
		}
		if err := ComputePatterns(ctx, j.db, userID); err != nil {
			j.logger.Error("patterns job: compute patterns", "user_id", userID, "error", err)
			continue
		}
		processed++
	}

	j.logger.Info("patterns job completed",
		"users_processed", processed,
		"elapsed", time.Since(start).Round(time.Millisecond),
	)
	return nil
}

// StartPatternJob runs the job once after a 30-second startup delay, then
// every 7 days. It stops cleanly when ctx is cancelled.
func StartPatternJob(ctx context.Context, job *Job) {
	go func() {
		select {
		case <-ctx.Done():
			return
		case <-time.After(30 * time.Second):
		}
		if err := job.Run(ctx); err != nil {
			job.logger.Error("patterns job: initial run failed", "error", err)
		}

		ticker := time.NewTicker(7 * 24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := job.Run(ctx); err != nil {
					job.logger.Error("patterns job: run failed", "error", err)
				}
			}
		}
	}()
}
