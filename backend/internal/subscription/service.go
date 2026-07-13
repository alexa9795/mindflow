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
	Limit       int  // -1 = unlimited
	CanPost     bool // final enforcement decision (journaling)
	CanUseAI    bool // whether AI features are unlocked (paid/trial/tester only)
	ExpiresAt   *time.Time
}

// Service is the business-logic interface for subscription checks.
type Service interface {
	CheckSubscription(ctx context.Context, userID string) (*SubscriptionStatus, error)
}

type service struct {
	repo Repository
}

// NewService returns a Service backed by the given Repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// CheckSubscription returns the current subscription state for a user.
func (s *service) CheckSubscription(ctx context.Context, userID string) (*SubscriptionStatus, error) {
	info, err := s.repo.GetSubscriptionInfo(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("check subscription: %w", err)
	}

	if info.IsTester {
		return &SubscriptionStatus{
			Tier:     TierTester,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
			CanUseAI: true,
		}, nil
	}

	switch info.SubscriptionType {
	case "monthly":
		return &SubscriptionStatus{
			Tier:     TierMonthly,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
			CanUseAI: true,
		}, nil
	case "yearly":
		return &SubscriptionStatus{
			Tier:     TierYearly,
			IsActive: true,
			Limit:    -1,
			CanPost:  true,
			CanUseAI: true,
		}, nil
	case "trial":
		if info.SubscriptionExpiresAt == nil || info.SubscriptionExpiresAt.After(time.Now()) {
			return &SubscriptionStatus{
				Tier:      TierTrial,
				IsActive:  true,
				Limit:     -1,
				CanPost:   true,
				CanUseAI:  true,
				ExpiresAt: info.SubscriptionExpiresAt,
			}, nil
		}
		// trial expired — fall through to free-tier logic
		fallthrough
	default:
		// Free tier: journaling is capped at 10 entries/month and AI features
		// are locked (they require an active trial or paid subscription).
		if info.EntriesThisMonth < 10 {
			return &SubscriptionStatus{
				Tier:        TierFree,
				IsActive:    true,
				Limit:       10,
				EntriesUsed: info.EntriesThisMonth,
				CanPost:     true,
				CanUseAI:    false,
			}, nil
		}
		return &SubscriptionStatus{
			Tier:        TierFree,
			IsActive:    false,
			Limit:       10,
			EntriesUsed: info.EntriesThisMonth,
			CanPost:     false,
			CanUseAI:    false,
		}, nil
	}
}
