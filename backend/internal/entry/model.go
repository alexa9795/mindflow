package entry

import "time"

type Entry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	MoodScore *int      `json:"mood_score,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	Messages  []Message `json:"messages,omitempty"`
}

type Message struct {
	ID        string    `json:"id"`
	EntryID   string    `json:"entry_id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// ExportUser is the user profile embedded in a GDPR data export.
type ExportUser struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	Name             string    `json:"name"`
	CreatedAt        time.Time `json:"created_at"`
	SubscriptionType string    `json:"subscription_type"`
}

// ExportData is the GDPR Article 20 machine-readable export for one user.
type ExportData struct {
	ExportedAt time.Time  `json:"exported_at"`
	User       ExportUser `json:"user"`
	Entries    []Entry    `json:"entries"`
}
