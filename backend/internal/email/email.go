package email

import (
	"context"
	"fmt"
	"os"

	resend "github.com/resend/resend-go/v2"
)

// Client wraps the Resend SDK for sending transactional emails.
type Client struct {
	resend    *resend.Client
	fromEmail string
}

// NewClient returns a Client configured from environment variables.
// Returns an error if RESEND_API_KEY or RESEND_FROM_EMAIL is missing.
func NewClient() (*Client, error) {
	key := os.Getenv("RESEND_API_KEY")
	if key == "" {
		return nil, fmt.Errorf("RESEND_API_KEY is required")
	}
	from := os.Getenv("RESEND_FROM_EMAIL")
	if from == "" {
		return nil, fmt.Errorf("RESEND_FROM_EMAIL is required")
	}
	return &Client{
		resend:    resend.NewClient(key),
		fromEmail: from,
	}, nil
}

// SendRetentionWarning sends a first inactivity warning to a user.
func (c *Client) SendRetentionWarning(ctx context.Context, toEmail, userName string, daysUntilDeletion int) error {
	body := fmt.Sprintf(`Hi %s,

We noticed you haven't journaled in a while. Your Echo account and all your entries will be deleted in %d days due to inactivity.

If you'd like to keep your account, simply open the app and write something — that's all it takes.

If you're happy for your data to be deleted, no action is needed.

Take care,
The Echo team`, userName, daysUntilDeletion)

	return c.send(ctx, toEmail, "Your Echo account will be deleted soon", body)
}

// SendFinalRetentionWarning sends the final warning 30 days before deletion.
func (c *Client) SendFinalRetentionWarning(ctx context.Context, toEmail, userName string) error {
	body := fmt.Sprintf(`Hi %s,

This is a final reminder that your Echo account will be permanently deleted in 30 days due to inactivity.

All your journal entries will be lost and cannot be recovered.

Open the app to keep your account active.

Take care,
The Echo team`, userName)

	return c.send(ctx, toEmail, "Final notice: Echo account deletion in 30 days", body)
}

// SendPasswordReset sends a password reset token to the user.
func (c *Client) SendPasswordReset(ctx context.Context, toEmail, userName, resetToken string) error {
	body := fmt.Sprintf(`Hi %s,

Someone requested a password reset for your Echo account.
If this wasn't you, ignore this email.

Your reset token is: %s
This token expires in 1 hour.

Take care,
The Echo team`, userName, resetToken)

	return c.send(ctx, toEmail, "Reset your Echo password", body)
}

func (c *Client) send(ctx context.Context, toEmail, subject, body string) error {
	params := &resend.SendEmailRequest{
		From:    c.fromEmail,
		To:      []string{toEmail},
		Subject: subject,
		Text:    body,
	}
	_, err := c.resend.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	return nil
}
