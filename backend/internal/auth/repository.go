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
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, name, created_at, ai_enabled FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.AIEnabled)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
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

func (r *repository) DeleteUser(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
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
