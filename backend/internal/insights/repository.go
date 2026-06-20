package insights

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// Insights contains aggregated journaling statistics for a user.
// Pattern fields (MostActiveDay etc.) are nil until the weekly pattern job runs.
type Insights struct {
	TotalEntries     int      `json:"total_entries"`
	AvgMoodLast30    *float64 `json:"avg_mood_last_30"`
	MostCommonMood   *int     `json:"most_common_mood"`
	CurrentStreak    int      `json:"current_streak"`
	LongestStreak    int      `json:"longest_streak"`
	EntriesThisMonth int      `json:"entries_this_month"`
	EntriesLastMonth int      `json:"entries_last_month"`

	// Pattern fields — populated from user_patterns after the weekly job runs.
	// All omitted from JSON when nil/empty.
	MostActiveDay     *string            `json:"most_active_day,omitempty"`
	LeastActiveDay    *string            `json:"least_active_day,omitempty"`
	PeakWritingHour   *int               `json:"peak_writing_hour,omitempty"`
	MoodTrend         *string            `json:"mood_trend,omitempty"`
	AvgMoodByDay      map[string]float64 `json:"avg_mood_by_day,omitempty"`
	EntriesPerWeekday map[string]int     `json:"entries_per_weekday,omitempty"`

	// CalendarThisMonth lists every day in the current month with at least one
	// entry, along with that day's average mood (null if no mood was logged).
	CalendarThisMonth []CalendarDay `json:"calendar_this_month,omitempty"`
}

// CalendarDay is one day-with-entries in the current-month calendar view.
type CalendarDay struct {
	Date string   `json:"date"`
	Mood *float64 `json:"mood"`
}

// UserPatterns holds the pre-computed pattern data read from user_patterns.
type UserPatterns struct {
	MostActiveDay     *string
	LeastActiveDay    *string
	PeakWritingHour   *int
	MoodTrend         *string
	AvgMoodByDay      map[string]float64
	EntriesPerWeekday map[string]int
}

// InsightsData is the raw result of the single-CTE repository query.
type InsightsData struct {
	TotalEntries      int
	ThisMonth         int
	LastMonth         int
	AvgMood           *float64
	CommonMood        *int
	EntryDates        []time.Time
	CalendarThisMonth []CalendarDay
}

// Repository is the data-access interface for insights queries.
type Repository interface {
	// GetInsightsData returns all aggregated stats in a single DB round trip.
	GetInsightsData(ctx context.Context, userID string) (*InsightsData, error)
	// GetPatterns returns pre-computed pattern data from user_patterns, or nil if
	// the weekly pattern job has not yet run for this user.
	GetPatterns(ctx context.Context, userID string) (*UserPatterns, error)
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
		),
		month_days AS (
			SELECT entry_date, AVG(mood_score) AS avg_mood
			FROM base
			WHERE entry_date >= DATE_TRUNC('month', NOW())::date
			GROUP BY entry_date
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
			) AS entry_dates,
			COALESCE(
				(SELECT json_agg(
					json_build_object('date', entry_date::text, 'mood', avg_mood)
					ORDER BY entry_date
				) FROM month_days),
				'[]'
			) AS calendar_this_month
		FROM totals t, monthly m, mood_stats ms`,
		userID,
	)

	var d InsightsData
	var avgMood sql.NullFloat64
	var commonMood sql.NullInt64
	var rawDates []string
	var rawCalendar []byte

	if err := row.Scan(
		&d.TotalEntries,
		&d.ThisMonth,
		&d.LastMonth,
		&avgMood,
		&commonMood,
		pq.Array(&rawDates),
		&rawCalendar,
	); err != nil {
		return nil, fmt.Errorf("get insights data: %w", err)
	}

	if err := json.Unmarshal(rawCalendar, &d.CalendarThisMonth); err != nil {
		return nil, fmt.Errorf("unmarshal calendar_this_month: %w", err)
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

// GetPatterns fetches pre-computed pattern data for the user from user_patterns.
// Returns nil, nil when no row exists (job hasn't run yet for this user).
func (r *repository) GetPatterns(ctx context.Context, userID string) (*UserPatterns, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT most_active_day, least_active_day, avg_mood_by_day,
		       peak_writing_hour, entries_per_weekday, mood_trend
		FROM user_patterns
		WHERE user_id = $1`,
		userID,
	)

	var mostActive, leastActive, moodTrend sql.NullString
	var peakHour                            sql.NullInt64
	var avgMoodRaw, entriesRaw             []byte

	if err := row.Scan(
		&mostActive, &leastActive, &avgMoodRaw,
		&peakHour, &entriesRaw, &moodTrend,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get patterns: %w", err)
	}

	p := &UserPatterns{}

	if mostActive.Valid {
		p.MostActiveDay = &mostActive.String
	}
	if leastActive.Valid {
		p.LeastActiveDay = &leastActive.String
	}
	if moodTrend.Valid {
		p.MoodTrend = &moodTrend.String
	}
	if peakHour.Valid {
		v := int(peakHour.Int64)
		p.PeakWritingHour = &v
	}
	if len(avgMoodRaw) > 0 {
		if err := json.Unmarshal(avgMoodRaw, &p.AvgMoodByDay); err != nil {
			return nil, fmt.Errorf("unmarshal avg_mood_by_day: %w", err)
		}
	}
	if len(entriesRaw) > 0 {
		if err := json.Unmarshal(entriesRaw, &p.EntriesPerWeekday); err != nil {
			return nil, fmt.Errorf("unmarshal entries_per_weekday: %w", err)
		}
	}

	return p, nil
}
