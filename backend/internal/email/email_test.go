package email

import (
	"testing"
)

func TestNewClientMissingAPIKey(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "")
	t.Setenv("RESEND_FROM_EMAIL", "")
	_, err := NewClient()
	if err == nil {
		t.Error("expected error when RESEND_API_KEY is missing")
	}
}

func TestNewClientMissingFromEmail(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test_key")
	t.Setenv("RESEND_FROM_EMAIL", "")
	_, err := NewClient()
	if err == nil {
		t.Error("expected error when RESEND_FROM_EMAIL is missing")
	}
}

func TestNewClientSuccess(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test_key")
	t.Setenv("RESEND_FROM_EMAIL", "Echo <noreply@example.com>")
	c, err := NewClient()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c == nil {
		t.Error("expected non-nil client")
	}
}
