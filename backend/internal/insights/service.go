package insights

import (
	"context"
	"fmt"
	"time"
)

// Service is the business-logic interface for insights.
type Service interface {
	GetInsights(ctx context.Context, userID string) (*Insights, error)
}

type service struct {
	repo Repository
}

// NewService returns an insights Service backed by the given Repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetInsights(ctx context.Context, userID string) (*Insights, error) {
	data, err := s.repo.GetInsightsData(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: %w", err)
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	current, longest := computeStreaks(data.EntryDates, today)

	return &Insights{
		TotalEntries:     data.TotalEntries,
		AvgMoodLast30:    data.AvgMood,
		MostCommonMood:   data.CommonMood,
		CurrentStreak:    current,
		LongestStreak:    longest,
		EntriesThisMonth: data.ThisMonth,
		EntriesLastMonth: data.LastMonth,
	}, nil
}

// computeStreaks calculates the current and longest journaling streaks from a
// list of distinct entry dates sorted newest-first.
//
// Current streak: consecutive days ending on today or yesterday (grace period
// so a streak doesn't break at midnight before the user has written today).
// Longest streak: the longest run of consecutive days across all history.
//
// NOTE: streak calculation uses UTC dates. Users in UTC+12 or UTC-12
// may see streaks that are off by one day depending on when they journal.
// Phase 2: add timezone preference to user settings.
func computeStreaks(days []time.Time, today time.Time) (current, longest int) {
	if len(days) == 0 {
		return 0, 0
	}

	// Longest streak — walk through all consecutive day pairs.
	longest = 1
	run := 1
	for i := 1; i < len(days); i++ {
		if days[i].Equal(days[i-1].Add(-24 * time.Hour)) {
			run++
			if run > longest {
				longest = run
			}
		} else {
			run = 1
		}
	}

	// Current streak — start from most recent entry day.
	// Grace period: if the most recent entry was yesterday the streak is still
	// alive (the user still has today to write).
	yesterday := today.Add(-24 * time.Hour)
	if days[0].Before(yesterday) {
		current = 0
		return
	}
	current = 1
	expected := days[0].Add(-24 * time.Hour)
	for _, d := range days[1:] {
		if d.Equal(expected) {
			current++
			expected = expected.Add(-24 * time.Hour)
		} else {
			break
		}
	}
	return
}
