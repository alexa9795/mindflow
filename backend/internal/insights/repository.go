package insights

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Insights contains aggregated journaling statistics for a user.
// Stats are computed live from the entries table. The insights DB table
// is reserved for Phase 2 pattern detection (weekly summaries, word clouds).
type Insights struct {
	TotalEntries     int      `json:"total_entries"`
	AvgMoodLast30    *float64 `json:"avg_mood_last_30"`
	MostCommonMood   *int     `json:"most_common_mood"`
	CurrentStreak    int      `json:"current_streak"`
	LongestStreak    int      `json:"longest_streak"`
	EntriesThisMonth int      `json:"entries_this_month"`
	EntriesLastMonth int      `json:"entries_last_month"`
}

// Repository is the data-access interface for insights queries.
type Repository interface {
	TotalEntries(ctx context.Context, userID string) (int, error)
	AvgMoodLast30Days(ctx context.Context, userID string) (*float64, error)
	MostCommonMoodLast30Days(ctx context.Context, userID string) (*int, error)
	EntriesThisMonth(ctx context.Context, userID string) (int, error)
	EntriesLastMonth(ctx context.Context, userID string) (int, error)
	// EntryDates returns distinct calendar dates with at least one entry,
	// newest first (UTC). Used for streak calculation.
	EntryDates(ctx context.Context, userID string) ([]time.Time, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) TotalEntries(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM entries WHERE user_id = $1`, userID,
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("total entries: %w", err)
	}
	return n, nil
}

func (r *repository) AvgMoodLast30Days(ctx context.Context, userID string) (*float64, error) {
	var avg sql.NullFloat64
	err := r.db.QueryRowContext(ctx, `
		SELECT AVG(mood_score)
		FROM entries
		WHERE user_id = $1
		  AND mood_score IS NOT NULL
		  AND created_at >= NOW() - INTERVAL '30 days'`,
		userID,
	).Scan(&avg)
	if err != nil {
		return nil, fmt.Errorf("avg mood last 30 days: %w", err)
	}
	if !avg.Valid {
		return nil, nil
	}
	return &avg.Float64, nil
}

func (r *repository) MostCommonMoodLast30Days(ctx context.Context, userID string) (*int, error) {
	var mood sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT mood_score
		FROM entries
		WHERE user_id = $1
		  AND mood_score IS NOT NULL
		  AND created_at >= NOW() - INTERVAL '30 days'
		GROUP BY mood_score
		ORDER BY COUNT(*) DESC
		LIMIT 1`,
		userID,
	).Scan(&mood)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("most common mood last 30 days: %w", err)
	}
	if !mood.Valid {
		return nil, nil
	}
	v := int(mood.Int64)
	return &v, nil
}

func (r *repository) EntriesThisMonth(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM entries
		WHERE user_id = $1
		  AND DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') =
		      DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')`,
		userID,
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("entries this month: %w", err)
	}
	return n, nil
}

func (r *repository) EntriesLastMonth(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM entries
		WHERE user_id = $1
		  AND DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') =
		      DATE_TRUNC('month', (NOW() - INTERVAL '1 month') AT TIME ZONE 'UTC')`,
		userID,
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("entries last month: %w", err)
	}
	return n, nil
}

func (r *repository) EntryDates(ctx context.Context, userID string) ([]time.Time, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC')
		FROM entries
		WHERE user_id = $1
		ORDER BY 1 DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("entry dates: %w", err)
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan entry date: %w", err)
		}
		dates = append(dates, d.UTC().Truncate(24*time.Hour))
	}
	return dates, rows.Err()
}
