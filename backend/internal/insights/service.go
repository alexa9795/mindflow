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
	total, err := s.repo.TotalEntries(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: total entries: %w", err)
	}

	avg, err := s.repo.AvgMoodLast30Days(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: avg mood: %w", err)
	}

	mostCommon, err := s.repo.MostCommonMoodLast30Days(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: most common mood: %w", err)
	}

	thisMonth, err := s.repo.EntriesThisMonth(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: entries this month: %w", err)
	}

	lastMonth, err := s.repo.EntriesLastMonth(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: entries last month: %w", err)
	}

	dates, err := s.repo.EntryDates(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get insights: entry dates: %w", err)
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	current, longest := computeStreaks(dates, today)

	return &Insights{
		TotalEntries:     total,
		AvgMoodLast30:    avg,
		MostCommonMood:   mostCommon,
		CurrentStreak:    current,
		LongestStreak:    longest,
		EntriesThisMonth: thisMonth,
		EntriesLastMonth: lastMonth,
	}, nil
}

// computeStreaks calculates the current and longest journaling streaks from a
// list of distinct entry dates sorted newest-first.
//
// Current streak: consecutive days ending on today or yesterday (grace period
// so a streak doesn't break at midnight before the user has written today).
// Longest streak: the longest run of consecutive days across all history.
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
