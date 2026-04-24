package export

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// Repository is the data-access interface for GDPR export queries.
// It reads from the users and audit_events tables.
type Repository interface {
	GetUserForExport(ctx context.Context, userID string) (*ExportUser, error)
	GetAuditEventsForExport(ctx context.Context, userID string) ([]ExportAuditEvent, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// GetUserForExport fetches the user profile fields needed for a GDPR Article 20 export.
func (r *repository) GetUserForExport(ctx context.Context, userID string) (*ExportUser, error) {
	var u ExportUser
	var aiConsentGivenAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, name, created_at, last_active_at, subscription_type, ai_enabled, ai_consent_given_at
		FROM users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.LastActiveAt, &u.SubscriptionType, &u.AIEnabled, &aiConsentGivenAt)
	if err != nil {
		return nil, fmt.Errorf("get user for export: %w", err)
	}
	if aiConsentGivenAt.Valid {
		t := aiConsentGivenAt.Time
		u.AIConsentGivenAt = &t
	}
	return &u, nil
}

// GetAuditEventsForExport returns the user's audit trail for GDPR Article 15.
func (r *repository) GetAuditEventsForExport(ctx context.Context, userID string) ([]ExportAuditEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT action, ip_address, metadata, created_at
		FROM audit_events
		WHERE user_id = $1
		ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get audit events for export: %w", err)
	}
	defer rows.Close()

	var events []ExportAuditEvent
	for rows.Next() {
		var e ExportAuditEvent
		var ipAddr *string
		var metaRaw []byte
		if err := rows.Scan(&e.Action, &ipAddr, &metaRaw, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan audit event: %w", err)
		}
		e.IPAddress = ipAddr
		if len(metaRaw) > 0 {
			var m map[string]any
			if err := json.Unmarshal(metaRaw, &m); err == nil {
				e.Metadata = m
			}
		}
		events = append(events, e)
	}
	return events, rows.Err()
}
