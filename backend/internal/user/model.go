package user

import "time"

type User struct {
	ID               string     `json:"id"`
	Email            string     `json:"email"`
	Name             string     `json:"name"`
	SubscriptionTier string     `json:"subscription_tier"`
	TrialEndsAt      *time.Time `json:"trial_ends_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}
