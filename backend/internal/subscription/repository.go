package subscription

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SubscriptionInfo holds the raw subscription fields fetched from the DB.
type SubscriptionInfo struct {
	SubscriptionType      string
	SubscriptionExpiresAt *time.Time
	IsTester              bool
	EntriesThisMonth      int
}

// Repository is the data-access interface for subscription queries.
type Repository interface {
	GetSubscriptionInfo(ctx context.Context, userID string) (*SubscriptionInfo, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetSubscriptionInfo(ctx context.Context, userID string) (*SubscriptionInfo, error) {
	var info SubscriptionInfo
	var expiresAt sql.NullTime

	err := r.db.QueryRowContext(ctx, `
		SELECT
			u.subscription_type,
			u.subscription_expires_at,
			u.is_tester,
			COUNT(e.id) AS entries_this_month
		FROM users u
		LEFT JOIN entries e
			ON e.user_id = u.id
			AND e.created_at >= date_trunc('month', now())
		WHERE u.id = $1
		GROUP BY u.subscription_type, u.subscription_expires_at, u.is_tester`,
		userID,
	).Scan(&info.SubscriptionType, &expiresAt, &info.IsTester, &info.EntriesThisMonth)
	if err != nil {
		return nil, fmt.Errorf("get subscription info: %w", err)
	}
	if expiresAt.Valid {
		info.SubscriptionExpiresAt = &expiresAt.Time
	}
	return &info, nil
}
