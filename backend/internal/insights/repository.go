package insights

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
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

// InsightsData is the raw result of the single-CTE repository query.
type InsightsData struct {
	TotalEntries int
	ThisMonth    int
	LastMonth    int
	AvgMood      *float64
	CommonMood   *int
	EntryDates   []time.Time
}

// Repository is the data-access interface for insights queries.
type Repository interface {
	// GetInsightsData returns all aggregated stats in a single DB round trip.
	GetInsightsData(ctx context.Context, userID string) (*InsightsData, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// GetInsightsData runs a single CTE query to fetch all insight metrics at once.
func (r *repository) GetInsightsData(ctx context.Context, userID string) (*InsightsData, error) {
	row := r.db.QueryRowContext(ctx, `
		WITH
		base AS (
			SELECT mood_score,
			       (created_at AT TIME ZONE 'UTC')::date AS entry_date
			FROM entries
			WHERE user_id = $1
		),
		totals AS (
			SELECT COUNT(*)::int AS total_entries FROM base
		),
		monthly AS (
			SELECT
				COUNT(*) FILTER (
					WHERE entry_date >= DATE_TRUNC('month', NOW())::date
				)::int AS this_month,
				COUNT(*) FILTER (
					WHERE entry_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')::date
					  AND entry_date <  DATE_TRUNC('month', NOW())::date
				)::int AS last_month
			FROM base
		),
		mood_stats AS (
			SELECT
				AVG(mood_score) FILTER (
					WHERE entry_date >= (NOW() - INTERVAL '30 days')::date
					  AND mood_score IS NOT NULL
				) AS avg_mood,
				MODE() WITHIN GROUP (ORDER BY mood_score) FILTER (
					WHERE entry_date >= (NOW() - INTERVAL '30 days')::date
					  AND mood_score IS NOT NULL
				) AS common_mood
			FROM base
		)
		SELECT
			t.total_entries,
			m.this_month,
			m.last_month,
			ms.avg_mood,
			ms.common_mood,
			ARRAY(
				SELECT DISTINCT entry_date::text
				FROM base
				ORDER BY entry_date DESC
			) AS entry_dates
		FROM totals t, monthly m, mood_stats ms`,
		userID,
	)

	var d InsightsData
	var avgMood sql.NullFloat64
	var commonMood sql.NullInt64
	var rawDates []string

	if err := row.Scan(
		&d.TotalEntries,
		&d.ThisMonth,
		&d.LastMonth,
		&avgMood,
		&commonMood,
		pq.Array(&rawDates),
	); err != nil {
		return nil, fmt.Errorf("get insights data: %w", err)
	}

	if avgMood.Valid {
		d.AvgMood = &avgMood.Float64
	}
	if commonMood.Valid {
		v := int(commonMood.Int64)
		d.CommonMood = &v
	}

	d.EntryDates = make([]time.Time, 0, len(rawDates))
	for _, s := range rawDates {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil, fmt.Errorf("parse entry date %q: %w", s, err)
		}
		d.EntryDates = append(d.EntryDates, t.UTC())
	}

	return &d, nil
}
