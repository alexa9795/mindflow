package subscription

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type subscriptionInfo struct {
	subscriptionType      string
	subscriptionExpiresAt *time.Time
	isTester              bool
	entriesThisMonth      int
}

// Repository is the data-access interface for subscription queries.
type Repository interface {
	getSubscriptionInfo(ctx context.Context, userID string) (*subscriptionInfo, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) getSubscriptionInfo(ctx context.Context, userID string) (*subscriptionInfo, error) {
	var info subscriptionInfo
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
	).Scan(&info.subscriptionType, &expiresAt, &info.isTester, &info.entriesThisMonth)
	if err != nil {
		return nil, fmt.Errorf("get subscription info: %w", err)
	}
	if expiresAt.Valid {
		info.subscriptionExpiresAt = &expiresAt.Time
	}
	return &info, nil
}
