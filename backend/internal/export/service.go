package export

import (
	"context"
	"fmt"
	"time"

	"github.com/alexa9795/mindflow/internal/entry"
)

// EntryExporter is the subset of entry.Repository needed by the export service.
type EntryExporter interface {
	ExportUserData(ctx context.Context, userID string) ([]entry.Entry, error)
}

// Service is the business-logic interface for GDPR data exports.
type Service interface {
	GetExport(ctx context.Context, userID string) (*ExportData, error)
}

type service struct {
	repo      Repository
	entryRepo EntryExporter
}

// NewService returns an export Service backed by the given repositories.
func NewService(repo Repository, entryRepo EntryExporter) Service {
	return &service{repo: repo, entryRepo: entryRepo}
}

func (s *service) GetExport(ctx context.Context, userID string) (*ExportData, error) {
	user, err := s.repo.GetUserForExport(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user for export: %w", err)
	}
	entries, err := s.entryRepo.ExportUserData(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("export user data: %w", err)
	}
	auditEvents, err := s.repo.GetAuditEventsForExport(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("export audit events: %w", err)
	}
	if auditEvents == nil {
		auditEvents = []ExportAuditEvent{}
	}
	return &ExportData{
		ExportedAt:  time.Now().UTC(),
		User:        *user,
		Entries:     entries,
		AuditEvents: auditEvents,
	}, nil
}
