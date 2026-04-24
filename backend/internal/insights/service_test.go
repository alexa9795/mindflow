package insights

import (
	"context"
	"testing"
	"time"
)

// mockRepo is a test double for Repository.
type mockRepo struct {
	total      int
	avgMood    *float64
	mostCommon *int
	thisMonth  int
	lastMonth  int
	dates      []time.Time
	err        error
}

func (m *mockRepo) TotalEntries(_ context.Context, _ string) (int, error) {
	return m.total, m.err
}
func (m *mockRepo) AvgMoodLast30Days(_ context.Context, _ string) (*float64, error) {
	return m.avgMood, m.err
}
func (m *mockRepo) MostCommonMoodLast30Days(_ context.Context, _ string) (*int, error) {
	return m.mostCommon, m.err
}
func (m *mockRepo) EntriesThisMonth(_ context.Context, _ string) (int, error) {
	return m.thisMonth, m.err
}
func (m *mockRepo) EntriesLastMonth(_ context.Context, _ string) (int, error) {
	return m.lastMonth, m.err
}
func (m *mockRepo) EntryDates(_ context.Context, _ string) ([]time.Time, error) {
	return m.dates, m.err
}

func TestGetInsightsNoEntries(t *testing.T) {
	svc := NewService(&mockRepo{})
	ins, err := svc.GetInsights(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ins.TotalEntries != 0 {
		t.Errorf("expected 0 total entries, got %d", ins.TotalEntries)
	}
	if ins.AvgMoodLast30 != nil {
		t.Errorf("expected nil avg mood, got %v", ins.AvgMoodLast30)
	}
	if ins.CurrentStreak != 0 || ins.LongestStreak != 0 {
		t.Errorf("expected 0 streaks, got current=%d longest=%d",
			ins.CurrentStreak, ins.LongestStreak)
	}
}

// ---- computeStreaks unit tests ------------------------------------------

func day(base time.Time, offset int) time.Time {
	return base.AddDate(0, 0, offset)
}

func TestComputeStreaksEmpty(t *testing.T) {
	cur, long := computeStreaks(nil, time.Now().UTC())
	if cur != 0 || long != 0 {
		t.Errorf("expected (0,0), got (%d,%d)", cur, long)
	}
}

func TestComputeStreaksSingleEntryToday(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	cur, long := computeStreaks([]time.Time{today}, today)
	if cur != 1 || long != 1 {
		t.Errorf("expected (1,1), got (%d,%d)", cur, long)
	}
}

func TestComputeStreaksSingleEntryYesterday(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)
	// Most recent entry was yesterday — grace period keeps current streak alive.
	cur, _ := computeStreaks([]time.Time{yesterday}, today)
	if cur != 1 {
		t.Errorf("expected current streak=1 (grace period), got %d", cur)
	}
}

func TestComputeStreaksConsecutiveDays(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	// entries on today, yesterday, 2 days ago — 3 consecutive days
	dates := []time.Time{
		today,
		day(today, -1),
		day(today, -2),
	}
	cur, long := computeStreaks(dates, today)
	if cur != 3 {
		t.Errorf("expected current streak=3, got %d", cur)
	}
	if long != 3 {
		t.Errorf("expected longest streak=3, got %d", long)
	}
}

func TestComputeStreaksGapResetsCurrentStreak(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	// Most recent entry was 3 days ago — no grace period → current=0
	dates := []time.Time{
		day(today, -3),
		day(today, -4),
		day(today, -5),
	}
	cur, long := computeStreaks(dates, today)
	if cur != 0 {
		t.Errorf("expected current streak=0 after gap, got %d", cur)
	}
	if long != 3 {
		t.Errorf("expected longest streak=3, got %d", long)
	}
}

func TestComputeStreaksMultipleEntriesSameDay(t *testing.T) {
	// EntryDates returns DISTINCT dates, so two entries on the same day appear once.
	// This test verifies the streak logic handles it correctly.
	today := time.Now().UTC().Truncate(24 * time.Hour)
	dates := []time.Time{
		today,           // one entry today
		day(today, -1),  // one entry yesterday
	}
	cur, long := computeStreaks(dates, today)
	if cur != 2 {
		t.Errorf("expected current=2, got %d", cur)
	}
	if long != 2 {
		t.Errorf("expected longest=2, got %d", long)
	}
}

func TestComputeStreaksLongestInPast(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	// 5-day streak long ago, then a gap, then 2 recent days
	dates := []time.Time{
		today,
		day(today, -1),
		// gap
		day(today, -30),
		day(today, -31),
		day(today, -32),
		day(today, -33),
		day(today, -34),
	}
	cur, long := computeStreaks(dates, today)
	if cur != 2 {
		t.Errorf("expected current=2, got %d", cur)
	}
	if long != 5 {
		t.Errorf("expected longest=5 (past streak), got %d", long)
	}
}
