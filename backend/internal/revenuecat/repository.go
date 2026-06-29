package revenuecat

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Repository is the data-access interface for RevenueCat subscription updates.
type Repository interface {
	UpdateSubscription(ctx context.Context, userID string, tier string, expiresAt *time.Time) error
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// UpdateSubscription sets the subscription tier and expiry for a user.
// It does not touch is_tester or the trial flow.
func (r *repository) UpdateSubscription(ctx context.Context, userID string, tier string, expiresAt *time.Time) error {
	var exp sql.NullTime
	if expiresAt != nil {
		exp = sql.NullTime{Time: *expiresAt, Valid: true}
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE users SET subscription_type = $2, subscription_expires_at = $3 WHERE id = $1`,
		userID, tier, exp,
	)
	if err != nil {
		return fmt.Errorf("update subscription: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update subscription rows affected: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("update subscription: no user with id %q", userID)
	}
	return nil
}
