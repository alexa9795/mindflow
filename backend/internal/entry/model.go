package entry

import "time"

// MessageRole is a typed role for conversation messages.
type MessageRole string

const (
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

type Entry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"-"`
	Content   string    `json:"content"`
	MoodScore *int      `json:"mood_score,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	Messages  []Message `json:"messages,omitempty"`
}

type Message struct {
	ID        string      `json:"id"`
	EntryID   string      `json:"entry_id"`
	Role      MessageRole `json:"role"`
	Content   string      `json:"content"`
	CreatedAt time.Time   `json:"created_at"`
}
