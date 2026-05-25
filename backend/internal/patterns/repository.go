package patterns

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

// ComputePatterns derives statistical patterns for a single user from their
// journal entries and upserts the result to user_patterns.
//
// It runs a single SQL query that:
//   - Groups entries by (day_name, hour) over the last 90 days for activity stats
//   - Computes mood averages for the last 30 days and the prior 30 days in a
//     separate CTE for mood trend
//
// Mood trend thresholds (comparing avg mood last-30d vs 30-60d ago):
//
//	diff > +0.5  → improving
//	diff < -0.5  → declining
//	within ±0.5  → stable
//	< 5 entries with mood scores in last 60 days → insufficient_data
func ComputePatterns(ctx context.Context, db *sql.DB, userID string) error {
	rows, err := db.QueryContext(ctx, `
		WITH
		agg AS (
			SELECT
				TRIM(to_char(created_at AT TIME ZONE 'UTC', 'Day')) AS day_name,
				COUNT(*)::int                                         AS entry_count,
				AVG(mood_score)                                       AS avg_mood,
				EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int AS hour
			FROM entries
			WHERE user_id = $1
			  AND created_at > NOW() - INTERVAL '90 days'
			GROUP BY day_name, hour
		),
		mood AS (
			SELECT
				AVG(mood_score) FILTER (
					WHERE created_at > NOW() - INTERVAL '30 days'
				) AS recent_avg,
				AVG(mood_score) FILTER (
					WHERE created_at <= NOW() - INTERVAL '30 days'
				) AS prev_avg,
				COUNT(*)::int AS mood_count
			FROM entries
			WHERE user_id = $1
			  AND created_at > NOW() - INTERVAL '60 days'
			  AND mood_score IS NOT NULL
		)
		SELECT
			a.day_name,
			a.entry_count,
			a.avg_mood,
			a.hour,
			m.recent_avg,
			m.prev_avg,
			m.mood_count
		FROM agg a
		CROSS JOIN mood m
		ORDER BY a.day_name, a.hour`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("patterns query: %w", err)
	}
	defer rows.Close()

	// Accumulators for deriving pattern fields.
	dayEntryCount := map[string]int{}
	dayMoodSum    := map[string]float64{}
	dayMoodWeight := map[string]int{}
	hourCount     := map[int]int{}

	var recentAvg, prevAvg sql.NullFloat64
	var moodCount int
	seenFirst := false

	for rows.Next() {
		var dayName     string
		var entryCount  int
		var avgMood     sql.NullFloat64
		var hour        int
		var rAvg, pAvg sql.NullFloat64
		var mCount      int

		if err := rows.Scan(&dayName, &entryCount, &avgMood, &hour,
			&rAvg, &pAvg, &mCount); err != nil {
			return fmt.Errorf("scan pattern row: %w", err)
		}

		// Read mood trend values from first row — they are identical on every row
		// (CROSS JOIN with single-row mood CTE).
		if !seenFirst {
			recentAvg = rAvg
			prevAvg   = pAvg
			moodCount = mCount
			seenFirst = true
		}

		dayEntryCount[dayName] += entryCount
		hourCount[hour] += entryCount

		if avgMood.Valid {
			dayMoodSum[dayName] += avgMood.Float64 * float64(entryCount)
			dayMoodWeight[dayName] += entryCount
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("pattern rows: %w", err)
	}

	// No entries in the last 90 days — nothing to compute.
	if !seenFirst {
		return nil
	}

	// Derive most/least active day.
	mostActiveDay, leastActiveDay := activeDays(dayEntryCount)

	// Derive avg mood by day.
	avgMoodByDay := make(map[string]float64, len(dayMoodSum))
	for day, sum := range dayMoodSum {
		if w := dayMoodWeight[day]; w > 0 {
			avgMoodByDay[day] = sum / float64(w)
		}
	}

	// Derive peak writing hour.
	peakHour := peakKey(hourCount)

	// Derive mood trend.
	moodTrend := computeMoodTrend(recentAvg, prevAvg, moodCount)

	// Marshal JSONB columns.
	avgMoodJSON, err := json.Marshal(avgMoodByDay)
	if err != nil {
		return fmt.Errorf("marshal avg_mood_by_day: %w", err)
	}
	entriesJSON, err := json.Marshal(dayEntryCount)
	if err != nil {
		return fmt.Errorf("marshal entries_per_weekday: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO user_patterns
			(user_id, computed_at, most_active_day, least_active_day,
			 avg_mood_by_day, peak_writing_hour, entries_per_weekday, mood_trend)
		VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			computed_at        = EXCLUDED.computed_at,
			most_active_day    = EXCLUDED.most_active_day,
			least_active_day   = EXCLUDED.least_active_day,
			avg_mood_by_day    = EXCLUDED.avg_mood_by_day,
			peak_writing_hour  = EXCLUDED.peak_writing_hour,
			entries_per_weekday = EXCLUDED.entries_per_weekday,
			mood_trend         = EXCLUDED.mood_trend`,
		userID,
		nullIfEmpty(mostActiveDay),
		nullIfEmpty(leastActiveDay),
		string(avgMoodJSON),
		peakHour,
		string(entriesJSON),
		moodTrend,
	)
	if err != nil {
		return fmt.Errorf("upsert user_patterns: %w", err)
	}
	return nil
}

// activeDays returns the most and least active day names from a day→count map.
func activeDays(counts map[string]int) (most, least string) {
	maxVal, minVal := -1, int(^uint(0)>>1)
	for day, n := range counts {
		day = strings.TrimSpace(day)
		if n > maxVal {
			maxVal = n
			most = day
		}
		if n < minVal {
			minVal = n
			least = day
		}
	}
	return most, least
}

// peakKey returns the key (hour) with the maximum count.
func peakKey(counts map[int]int) int {
	max, peak := -1, 0
	for h, n := range counts {
		if n > max {
			max = n
			peak = h
		}
	}
	return peak
}

// computeMoodTrend compares recent vs previous 30-day mood averages.
func computeMoodTrend(recent, prev sql.NullFloat64, moodCount int) string {
	if moodCount < 5 || !recent.Valid || !prev.Valid {
		return "insufficient_data"
	}
	diff := recent.Float64 - prev.Float64
	switch {
	case diff > 0.5:
		return "improving"
	case diff < -0.5:
		return "declining"
	default:
		return "stable"
	}
}

// nullIfEmpty converts an empty string to nil for nullable SQL columns.
func nullIfEmpty(s string) interface{} {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return s
}
