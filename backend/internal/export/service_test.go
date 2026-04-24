package export

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alexa9795/mindflow/internal/entry"
)

// ---- Mocks ------------------------------------------------------------------

type mockExportRepo struct {
	user      *ExportUser
	events    []ExportAuditEvent
	userErr   error
	eventsErr error
}

func (m *mockExportRepo) GetUserForExport(_ context.Context, _ string) (*ExportUser, error) {
	return m.user, m.userErr
}

func (m *mockExportRepo) GetAuditEventsForExport(_ context.Context, _ string) ([]ExportAuditEvent, error) {
	return m.events, m.eventsErr
}

type mockEntryExporter struct {
	entries []entry.Entry
	err     error
}

func (m *mockEntryExporter) ExportUserData(_ context.Context, _ string) ([]entry.Entry, error) {
	return m.entries, m.err
}

// ---- Tests ------------------------------------------------------------------

func TestGetExport(t *testing.T) {
	now := time.Now()
	repo := &mockExportRepo{
		user:   &ExportUser{ID: "u1", Email: "a@b.com", Name: "Alice", CreatedAt: now},
		events: []ExportAuditEvent{{Action: "auth.login.success", CreatedAt: now}},
	}
	entryRepo := &mockEntryExporter{
		entries: []entry.Entry{{ID: "e1", Content: "Hello"}},
	}
	svc := NewService(repo, entryRepo)

	data, err := svc.GetExport(context.Background(), "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.User.ID != "u1" {
		t.Errorf("user ID = %q, want %q", data.User.ID, "u1")
	}
	if len(data.Entries) != 1 {
		t.Errorf("got %d entries, want 1", len(data.Entries))
	}
	if len(data.AuditEvents) != 1 {
		t.Errorf("got %d audit events, want 1", len(data.AuditEvents))
	}
	if data.ExportedAt.IsZero() {
		t.Error("ExportedAt must not be zero")
	}
}

// Nil audit events from the repo must be coerced to an empty slice, not nil,
// so the JSON output contains [] rather than null.
func TestGetExportNilAuditEventsBecomesEmptySlice(t *testing.T) {
	repo := &mockExportRepo{
		user:   &ExportUser{ID: "u2", Email: "b@b.com"},
		events: nil,
	}
	svc := NewService(repo, &mockEntryExporter{})

	data, err := svc.GetExport(context.Background(), "u2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.AuditEvents == nil {
		t.Error("AuditEvents should be an empty slice, not nil")
	}
}

func TestGetExportUserRepoError(t *testing.T) {
	repo := &mockExportRepo{userErr: errors.New("db down")}
	svc := NewService(repo, &mockEntryExporter{})

	_, err := svc.GetExport(context.Background(), "u1")
	if err == nil {
		t.Fatal("expected error from user repo, got nil")
	}
}

func TestGetExportEntryRepoError(t *testing.T) {
	repo := &mockExportRepo{
		user:   &ExportUser{ID: "u3"},
		events: []ExportAuditEvent{},
	}
	svc := NewService(repo, &mockEntryExporter{err: errors.New("entry repo error")})

	_, err := svc.GetExport(context.Background(), "u3")
	if err == nil {
		t.Fatal("expected error from entry repo, got nil")
	}
}

func TestGetExportAuditEventsRepoError(t *testing.T) {
	repo := &mockExportRepo{
		user:      &ExportUser{ID: "u4"},
		eventsErr: errors.New("audit repo error"),
	}
	svc := NewService(repo, &mockEntryExporter{entries: []entry.Entry{}})

	_, err := svc.GetExport(context.Background(), "u4")
	if err == nil {
		t.Fatal("expected error from audit events repo, got nil")
	}
}
