package auth

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Repository is the data-access interface for auth operations.
type Repository interface {
	CreateUser(ctx context.Context, email, name, passwordHash string, trialEndsAt time.Time) (id string, err error)
	GetUserByEmail(ctx context.Context, email string) (id, name, passwordHash string, err error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	UpdateUserName(ctx context.Context, id, name string) error
	DeleteUser(ctx context.Context, id string) error
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(ctx context.Context, email, name, passwordHash string, trialEndsAt time.Time) (string, error) {
	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users (email, name, password_hash, subscription_type, trial_ends_at)
		VALUES ($1, $2, $3, 'trial', $4)
		RETURNING id`,
		email, name, passwordHash, trialEndsAt,
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
		SELECT id, email, name, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

func (r *repository) UpdateUserName(ctx context.Context, id, name string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE users SET name = $1 WHERE id = $2`, name, id)
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
