package auth

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Repository is the data-access interface for auth operations.
type Repository interface {
	CreateUser(ctx context.Context, email, name, passwordHash string) (id string, err error)
	GetUserByEmail(ctx context.Context, email string) (id, name, passwordHash string, err error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	UpdateUserName(ctx context.Context, id, name string) error
	DeleteUser(ctx context.Context, id string) error
	GetSubscriptionType(ctx context.Context, userID string) (string, error)
	ActivateTrial(ctx context.Context, userID string) (time.Time, error)
	UpdateAIEnabled(ctx context.Context, userID string, enabled bool) error
	GetAIEnabled(ctx context.Context, userID string) (bool, error)
	RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
	UpdateLastActive(ctx context.Context, userID string) error
	SetAIConsent(ctx context.Context, userID string) error
	UpdatePassword(ctx context.Context, userID, passwordHash string) error
	// Password reset.
	SetResetToken(ctx context.Context, userID, token string, expiresAt time.Time) error
	GetUserByResetToken(ctx context.Context, token string) (*User, error)
	ClearResetToken(ctx context.Context, userID string) error
	// Refresh tokens.
	CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error
	GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, id string) error
	RevokeAllUserRefreshTokens(ctx context.Context, userID string) error
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(ctx context.Context, email, name, passwordHash string) (string, error) {
	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users (email, name, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id`,
		email, name, passwordHash,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("create user: %w", err)
	}
	return id, nil
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (id, name, passwordHash string, err error) {
	err = r.db.QueryRowContext(ctx, `
		SELECT id, name, password_hash FROM users WHERE email = $1`,
		email,
	).Scan(&id, &name, &passwordHash)
	if err != nil {
		return "", "", "", fmt.Errorf("get user by email: %w", err)
	}
	return id, name, passwordHash, nil
}

func (r *repository) GetUserByID(ctx context.Context, id string) (*User, error) {
	var u User
	var aiConsentGivenAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, name, created_at, ai_enabled, ai_consent_given_at
		FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.AIEnabled, &aiConsentGivenAt)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	if aiConsentGivenAt.Valid {
		t := aiConsentGivenAt.Time
		u.AIConsentGivenAt = &t
	}
	return &u, nil
}

func (r *repository) UpdateUserName(ctx context.Context, id, name string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`, name, id)
	if err != nil {
		return fmt.Errorf("update user name: %w", err)
	}
	return nil
}

// DeleteUser anonymizes audit records, then deletes the user row.
// Cascade handles entries, messages, refresh tokens; FK ON DELETE SET NULL handles audit events.
// Must be called AFTER logging the ActionDeleteAccount audit event (while user_id FK is valid).
func (r *repository) DeleteUser(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Anonymize audit records before the user row is deleted (while user_id FK still exists).
	if _, err := tx.ExecContext(ctx,
		`UPDATE audit_events SET ip_address = NULL, metadata = metadata - 'ip' - 'email'
		 WHERE user_id = $1`, id,
	); err != nil {
		return fmt.Errorf("anonymize audit records: %w", err)
	}

	// Delete user — cascade removes entries, messages, refresh_tokens.
	if _, err := tx.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	return tx.Commit()
}

func (r *repository) GetSubscriptionType(ctx context.Context, userID string) (string, error) {
	var subType string
	err := r.db.QueryRowContext(ctx,
		`SELECT subscription_type FROM users WHERE id = $1`, userID,
	).Scan(&subType)
	if err != nil {
		return "", fmt.Errorf("get subscription type: %w", err)
	}
	return subType, nil
}

func (r *repository) ActivateTrial(ctx context.Context, userID string) (time.Time, error) {
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, `
		UPDATE users
		SET subscription_type = 'trial',
		    subscription_expires_at = NOW() + INTERVAL '7 days'
		WHERE id = $1
		RETURNING subscription_expires_at`,
		userID,
	).Scan(&expiresAt)
	if err != nil {
		return time.Time{}, fmt.Errorf("activate trial: %w", err)
	}
	return expiresAt, nil
}

func (r *repository) UpdateAIEnabled(ctx context.Context, userID string, enabled bool) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET ai_enabled = $1, updated_at = NOW() WHERE id = $2`,
		enabled, userID,
	)
	if err != nil {
		return fmt.Errorf("update ai enabled: %w", err)
	}
	return nil
}

func (r *repository) GetAIEnabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool
	err := r.db.QueryRowContext(ctx,
		`SELECT ai_enabled FROM users WHERE id = $1`, userID,
	).Scan(&enabled)
	if err != nil {
		return false, fmt.Errorf("get ai enabled: %w", err)
	}
	return enabled, nil
}

func (r *repository) RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		jti, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("revoke token: %w", err)
	}
	return nil
}

func (r *repository) IsTokenRevoked(ctx context.Context, jti string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1)`, jti,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is token revoked: %w", err)
	}
	return exists, nil
}

func (r *repository) UpdateLastActive(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET last_active_at = NOW() WHERE id = $1`, userID,
	)
	if err != nil {
		return fmt.Errorf("update last active: %w", err)
	}
	return nil
}

func (r *repository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		passwordHash, userID,
	)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (r *repository) SetAIConsent(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET ai_consent_given_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND ai_consent_given_at IS NULL`,
		userID,
	)
	return err
}

// --- Password reset ---

func (r *repository) SetResetToken(ctx context.Context, userID, token string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET reset_token = $1, reset_token_expires_at = $2, updated_at = NOW()
		 WHERE id = $3`,
		token, expiresAt, userID,
	)
	if err != nil {
		return fmt.Errorf("set reset token: %w", err)
	}
	return nil
}

func (r *repository) GetUserByResetToken(ctx context.Context, token string) (*User, error) {
	var u User
	var aiConsentGivenAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, name, created_at, ai_enabled, ai_consent_given_at
		FROM users
		WHERE reset_token = $1 AND reset_token_expires_at > NOW()`,
		token,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.AIEnabled, &aiConsentGivenAt)
	if err != nil {
		return nil, fmt.Errorf("get user by reset token: %w", err)
	}
	if aiConsentGivenAt.Valid {
		t := aiConsentGivenAt.Time
		u.AIConsentGivenAt = &t
	}
	return &u, nil
}

func (r *repository) ClearResetToken(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW()
		 WHERE id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("clear reset token: %w", err)
	}
	return nil
}

// --- Refresh tokens ---

func (r *repository) CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("create refresh token: %w", err)
	}
	return nil
}

func (r *repository) GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	var rt RefreshToken
	var revokedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
		FROM refresh_tokens
		WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
		tokenHash,
	).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt, &revokedAt)
	if err != nil {
		return nil, fmt.Errorf("get refresh token: %w", err)
	}
	if revokedAt.Valid {
		t := revokedAt.Time
		rt.RevokedAt = &t
	}
	return &rt, nil
}

func (r *repository) RevokeRefreshToken(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

func (r *repository) RevokeAllUserRefreshTokens(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked_at = NOW()
		 WHERE user_id = $1 AND revoked_at IS NULL`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("revoke all user refresh tokens: %w", err)
	}
	return nil
}
