package export

import (
	"time"

	"github.com/alexa9795/mindflow/internal/entry"
)

// ExportUser is the user profile embedded in a GDPR Article 20 export.
type ExportUser struct {
	ID               string     `json:"id"`
	Email            string     `json:"email"`
	Name             string     `json:"name"`
	CreatedAt        time.Time  `json:"created_at"`
	LastActiveAt     time.Time  `json:"last_active_at"`
	SubscriptionType string     `json:"subscription_type"`
	AIEnabled        bool       `json:"ai_enabled"`
	AIConsentGivenAt *time.Time `json:"ai_consent_given_at,omitempty"`
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
	Entries     []entry.Entry      `json:"entries"`
	AuditEvents []ExportAuditEvent `json:"audit_events"`
}
