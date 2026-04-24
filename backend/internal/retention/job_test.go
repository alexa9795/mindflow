package retention

import (
	"testing"
	"time"
)

// shouldFlag is the pure-logic core of Run() — tested directly so we
// don't need a real DB in these unit tests.

func TestShouldFlagDeleteThreshold(t *testing.T) {
	now := time.Now()
	lastActive := now.Add(-13 * 30 * 24 * time.Hour) // 13 months ago

	atWarn, atDelete := shouldFlag(lastActive, "free", now)

	if atWarn {
		t.Error("expected atWarning=false for 13 months inactive")
	}
	if !atDelete {
		t.Error("expected atDelete=true for 13 months inactive")
	}
}

func TestShouldFlagWarningThreshold(t *testing.T) {
	now := time.Now()
	// 11.5 months — inside the 11–12 month warning window
	lastActive := now.Add(-time.Duration(float64(11*30*24)*float64(time.Hour)) - 15*24*time.Hour)

	atWarn, atDelete := shouldFlag(lastActive, "free", now)

	if !atWarn {
		t.Error("expected atWarning=true for 11.5 months inactive")
	}
	if atDelete {
		t.Error("expected atDelete=false for 11.5 months inactive")
	}
}

func TestShouldFlagRecentlyActive(t *testing.T) {
	now := time.Now()
	lastActive := now.Add(-6 * 30 * 24 * time.Hour) // 6 months ago

	atWarn, atDelete := shouldFlag(lastActive, "free", now)

	if atWarn || atDelete {
		t.Errorf("expected no flags for 6 months inactive, got atWarn=%v atDelete=%v", atWarn, atDelete)
	}
}

func TestShouldFlagTesterNeverFlagged(t *testing.T) {
	now := time.Now()
	lastActive := now.Add(-13 * 30 * 24 * time.Hour) // 13 months ago

	atWarn, atDelete := shouldFlag(lastActive, "tester", now)

	if atWarn || atDelete {
		t.Errorf("tester account must never be flagged, got atWarn=%v atDelete=%v", atWarn, atDelete)
	}
}

func TestShouldFlagExactBoundaries(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name        string
		age         time.Duration
		subType     string
		wantWarn    bool
		wantDelete  bool
	}{
		{
			name:       "exactly at delete threshold",
			age:        InactivityDeleteThreshold,
			subType:    "free",
			wantWarn:   false,
			wantDelete: true,
		},
		{
			name:       "exactly at warning threshold",
			age:        InactivityWarningThreshold,
			subType:    "free",
			wantWarn:   true,
			wantDelete: false,
		},
		{
			name:       "one hour before warning threshold",
			age:        InactivityWarningThreshold - time.Hour,
			subType:    "free",
			wantWarn:   false,
			wantDelete: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lastActive := now.Add(-tt.age)
			atWarn, atDelete := shouldFlag(lastActive, tt.subType, now)
			if atWarn != tt.wantWarn || atDelete != tt.wantDelete {
				t.Errorf("shouldFlag(age=%v, %q) = (%v, %v), want (%v, %v)",
					tt.age, tt.subType, atWarn, atDelete, tt.wantWarn, tt.wantDelete)
			}
		})
	}
}
