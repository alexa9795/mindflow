package entry

import "time"

// MessageRole is a typed role for conversation messages.
type MessageRole string

const (
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

type Entry struct {
	ID        string      `json:"id"`
	UserID    string      `json:"user_id"`
	Content   string      `json:"content"`
	MoodScore *int        `json:"mood_score,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	Messages  []Message   `json:"messages,omitempty"`
}

type Message struct {
	ID        string      `json:"id"`
	EntryID   string      `json:"entry_id"`
	Role      MessageRole `json:"role"`
	Content   string      `json:"content"`
	CreatedAt time.Time   `json:"created_at"`
}

// ExportUser is the user profile embedded in a GDPR data export.
type ExportUser struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	Name             string    `json:"name"`
	CreatedAt        time.Time `json:"created_at"`
	LastActiveAt     time.Time `json:"last_active_at"`
	SubscriptionType string    `json:"subscription_type"`
	AIEnabled        bool      `json:"ai_enabled"`
}

// ExportAuditEvent is an audit log entry included in a GDPR data export.
// ip_address is included per GDPR Art. 15 — it is the user's own data.
type ExportAuditEvent struct {
	Action    string         `json:"action"`
	IPAddress *string        `json:"ip_address"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
}

// ExportData is the GDPR Article 20 machine-readable export for one user.
type ExportData struct {
	ExportedAt  time.Time          `json:"exported_at"`
	User        ExportUser         `json:"user"`
	Entries     []Entry            `json:"entries"`
	AuditEvents []ExportAuditEvent `json:"audit_events"`
}
