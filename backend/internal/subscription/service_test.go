package subscription

import (
	"context"
	"errors"
	"testing"
	"time"
)

// mockSubRepo is a controllable in-memory Repository for service tests.
type mockSubRepo struct {
	subType          string
	expiresAt        *time.Time
	isTester         bool
	entriesThisMonth int
	returnErr        error
}

func (m *mockSubRepo) GetSubscriptionInfo(_ context.Context, _ string) (*SubscriptionInfo, error) {
	if m.returnErr != nil {
		return nil, m.returnErr
	}
	return &SubscriptionInfo{
		SubscriptionType:      m.subType,
		SubscriptionExpiresAt: m.expiresAt,
		IsTester:              m.isTester,
		EntriesThisMonth:      m.entriesThisMonth,
	}, nil
}

func future() *time.Time { t := time.Now().Add(7 * 24 * time.Hour); return &t }
func past() *time.Time   { t := time.Now().Add(-24 * time.Hour); return &t }

func TestCheckSubscription(t *testing.T) {
	tests := []struct {
		name             string
		subType          string
		expiresAt        *time.Time
		isTester         bool
		entriesThisMonth int
		returnErr        error
		wantCanPost      bool
		wantLimit        int
		wantTier         SubscriptionTier
		wantIsActive     bool
		wantEntriesUsed  int
		wantErr          bool
	}{
		{
			name:         "tester gets unlimited access",
			isTester:     true,
			subType:      "free",
			wantCanPost:  true,
			wantLimit:    -1,
			wantTier:     TierTester,
			wantIsActive: true,
		},
		{
			name:         "monthly subscription is unlimited",
			subType:      "monthly",
			wantCanPost:  true,
			wantLimit:    -1,
			wantTier:     TierMonthly,
			wantIsActive: true,
		},
		{
			name:         "yearly subscription is unlimited",
			subType:      "yearly",
			wantCanPost:  true,
			wantLimit:    -1,
			wantTier:     TierYearly,
			wantIsActive: true,
		},
		{
			name:         "active trial is unlimited",
			subType:      "trial",
			expiresAt:    future(),
			wantCanPost:  true,
			wantLimit:    -1,
			wantTier:     TierTrial,
			wantIsActive: true,
		},
		{
			name:                "expired trial falls back to free tier logic",
			subType:             "trial",
			expiresAt:           past(),
			entriesThisMonth:    5,
			wantCanPost:         true,
			wantLimit:           10,
			wantTier:            TierFree,
			wantIsActive:        true,
			wantEntriesUsed:     5,
		},
		{
			name:             "free tier 0 entries can post",
			subType:          "free",
			entriesThisMonth: 0,
			wantCanPost:      true,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     true,
			wantEntriesUsed:  0,
		},
		{
			name:             "free tier 9 entries can still post",
			subType:          "free",
			entriesThisMonth: 9,
			wantCanPost:      true,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     true,
			wantEntriesUsed:  9,
		},
		{
			name:             "free tier 10 entries cannot post",
			subType:          "free",
			entriesThisMonth: 10,
			wantCanPost:      false,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     false,
			wantEntriesUsed:  10,
		},
		{
			name:             "free tier 11 entries cannot post (edge case)",
			subType:          "free",
			entriesThisMonth: 11,
			wantCanPost:      false,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     false,
			wantEntriesUsed:  11,
		},
		{
			name:             "expired trial + 10 entries cannot post",
			subType:          "trial",
			expiresAt:        past(),
			entriesThisMonth: 10,
			wantCanPost:      false,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     false,
			wantEntriesUsed:  10,
		},
		{
			name:             "expired trial + 5 entries can post",
			subType:          "trial",
			expiresAt:        past(),
			entriesThisMonth: 5,
			wantCanPost:      true,
			wantLimit:        10,
			wantTier:         TierFree,
			wantIsActive:     true,
			wantEntriesUsed:  5,
		},
		{
			name:      "repo error propagates",
			returnErr: errors.New("db error"),
			wantErr:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockSubRepo{
				subType:          tc.subType,
				expiresAt:        tc.expiresAt,
				isTester:         tc.isTester,
				entriesThisMonth: tc.entriesThisMonth,
				returnErr:        tc.returnErr,
			}
			svc := NewService(repo)
			status, err := svc.CheckSubscription(context.Background(), "any-user-id")

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if status.CanPost != tc.wantCanPost {
				t.Errorf("CanPost = %v, want %v", status.CanPost, tc.wantCanPost)
			}
			if status.Limit != tc.wantLimit {
				t.Errorf("Limit = %d, want %d", status.Limit, tc.wantLimit)
			}
			if status.Tier != tc.wantTier {
				t.Errorf("Tier = %q, want %q", status.Tier, tc.wantTier)
			}
			if status.IsActive != tc.wantIsActive {
				t.Errorf("IsActive = %v, want %v", status.IsActive, tc.wantIsActive)
			}
			if status.EntriesUsed != tc.wantEntriesUsed {
				t.Errorf("EntriesUsed = %d, want %d", status.EntriesUsed, tc.wantEntriesUsed)
			}
		})
	}
}
