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

// ExportData is the GDPR Article 20 machine-readable export for one user.
type ExportData struct {
	ExportedAt time.Time `json:"exported_at"`
	Entries    []Entry   `json:"entries"`
}
