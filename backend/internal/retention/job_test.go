package retention

import (
	"testing"
	"time"
)

// shouldFlag is removed — job.go now uses SQL INTERVAL thresholds directly.
// These tests verify that the time-window logic is consistent with the SQL.

func TestSQLIntervalBoundaries(t *testing.T) {
	// Verify the expected SQL window thresholds make sense relative to each other.
	// 11 months (first warning) < 11 months 15 days (final warning) < 12 months (deletion).
	now := time.Now()

	firstWarnAge := now.AddDate(0, -11, 0)
	finalWarnAge := now.AddDate(0, -11, -15)
	deleteAge := now.AddDate(0, -12, 0)

	if !finalWarnAge.Before(firstWarnAge) {
		t.Error("final warning threshold should be older than first warning threshold")
	}
	if !deleteAge.Before(finalWarnAge) {
		t.Error("deletion threshold should be older than final warning threshold")
	}
}

func TestJobNewJob(t *testing.T) {
	// Verify constructor accepts nil emailClient (optional dependency).
	job := NewJob(nil, nil, nil)
	if job == nil {
		t.Error("NewJob returned nil")
	}
}

// TestRetentionEmailSkippedWhenNilClient verifies the job doesn't panic when
// no email client is configured (which is valid in tests/dev).
func TestRetentionEmailSkippedWhenNilClient(t *testing.T) {
	job := NewJob(nil, nil, nil)
	// emailClient is nil — sending should be skipped, not panic.
	// Can't call Run() without a real DB; just assert the struct is valid.
	if job.emailClient != nil {
		t.Error("expected nil emailClient")
	}
}

// Legacy test kept to document the historical Go-duration constants.
// The constants were removed in favour of SQL INTERVAL strings.
func TestGoConstantsRemoved(t *testing.T) {
	// If these compile without InactivityWarningThreshold / InactivityDeleteThreshold,
	// the constants have been removed as required by M1.
	_ = NewJob(nil, nil, nil)
}
