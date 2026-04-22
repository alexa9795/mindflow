package subscription

import (
	"context"
	"fmt"
	"time"
)

// SubscriptionTier represents the user's subscription level.
type SubscriptionTier string

const (
	TierFree    SubscriptionTier = "free"
	TierTrial   SubscriptionTier = "trial"
	TierMonthly SubscriptionTier = "monthly"
	TierYearly  SubscriptionTier = "yearly"
	TierTester  SubscriptionTier = "tester"
)

// SubscriptionStatus is the computed subscription state for a user.
type SubscriptionStatus struct {
	Tier        SubscriptionTier
	IsActive    bool
	EntriesUsed int
	Limit       int       // -1 = unlimited
	CanPost     bool      // final enforcement decision
	ExpiresAt   *time.Time
}

// Service computes subscription status from the database.
type Service struct {
	repo Repository
}

// NewService returns a Service backed by the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// CheckSubscription returns the current subscription state for a user.
func (s *Service) CheckSubscription(ctx context.Context, userID string) (*SubscriptionStatus, error) {
	info, err := s.repo.getSubscriptionInfo(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("check subscription: %w", err)
	}

	if info.isTester {
		return &SubscriptionStatus{
			Tier:     TierTester,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
		}, nil
	}

	switch info.subscriptionType {
	case "monthly":
		return &SubscriptionStatus{
			Tier:     TierMonthly,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
		}, nil
	case "yearly":
		return &SubscriptionStatus{
			Tier:     TierYearly,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
		}, nil
	case "trial":
		if info.subscriptionExpiresAt == nil || info.subscriptionExpiresAt.After(time.Now()) {
			return &SubscriptionStatus{
				Tier:      TierTrial,
				IsActive:  true,
				Limit:     -1,
				CanPost:   true,
				ExpiresAt: info.subscriptionExpiresAt,
			}, nil
		}
		// trial expired — fall through to free-tier logic
		fallthrough
	default:
		if info.entriesThisMonth < 10 {
			return &SubscriptionStatus{
				Tier:        TierFree,
				IsActive:    true,
				Limit:       10,
				EntriesUsed: info.entriesThisMonth,
				CanPost:     true,
			}, nil
		}
		return &SubscriptionStatus{
			Tier:        TierFree,
			IsActive:    false,
			Limit:       10,
			EntriesUsed: info.entriesThisMonth,
			CanPost:     false,
		}, nil
	}
}
