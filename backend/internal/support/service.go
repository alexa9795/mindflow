package support

import (
	"context"
	"errors"
	"fmt"

	"github.com/alexa9795/mindflow/internal/auth"
	"github.com/alexa9795/mindflow/internal/email"
)

// ErrEmailUnavailable is returned when the email client isn't configured
// (RESEND_API_KEY/RESEND_FROM_EMAIL unset) — see email.NewClient.
var ErrEmailUnavailable = errors.New("support email is not configured")

// UserLookup provides the reporter's contact details. auth.Service satisfies
// this via GetMe.
type UserLookup interface {
	GetMe(ctx context.Context, userID string) (*auth.User, error)
}

// Service handles user-submitted issue reports.
type Service interface {
	ReportIssue(ctx context.Context, userID, message, appVersion, platform string) error
}

type service struct {
	emailClient *email.Client
	users       UserLookup
}

// NewService returns a Service backed by the given email Client (may be nil —
// ReportIssue returns ErrEmailUnavailable in that case) and UserLookup.
func NewService(emailClient *email.Client, users UserLookup) Service {
	return &service{emailClient: emailClient, users: users}
}

func (s *service) ReportIssue(ctx context.Context, userID, message, appVersion, platform string) error {
	if s.emailClient == nil {
		return ErrEmailUnavailable
	}
	user, err := s.users.GetMe(ctx, userID)
	if err != nil {
		return fmt.Errorf("get reporter: %w", err)
	}
	if err := s.emailClient.SendIssueReport(ctx, user.Email, user.Name, message, appVersion, platform); err != nil {
		return fmt.Errorf("send issue report: %w", err)
	}
	return nil
}
