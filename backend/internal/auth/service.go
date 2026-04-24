package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/alexa9795/mindflow/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// dummyHash is a pre-computed bcrypt hash used to equalise response timing
// when a login attempt is made for an email that does not exist.
// Without this, the absence of bcrypt work leaks whether an email is registered.
var dummyHash []byte

func init() {
	var err error
	dummyHash, err = bcrypt.GenerateFromPassword([]byte("echo-dummy-bcrypt-sentinel"), bcrypt.DefaultCost)
	if err != nil {
		panic(fmt.Sprintf("failed to initialise dummy bcrypt hash: %v", err))
	}
}

// Service is the business-logic interface for authentication.
type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	GetMe(ctx context.Context, userID string) (*User, error)
	UpdateMe(ctx context.Context, userID, name string) (*User, error)
	DeleteMe(ctx context.Context, userID string) error
	ActivateTrial(ctx context.Context, userID string) (time.Time, error)
	UpdateAIEnabled(ctx context.Context, userID string, enabled bool) error
	GetAIEnabled(ctx context.Context, userID string) (bool, error)
	RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error
}

type service struct {
	repo Repository
}

// NewService returns an auth Service backed by the given Repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	userID, err := s.repo.CreateUser(ctx, req.Email, req.Name, string(hashed))
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEmailExists
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	token, err := generateToken(userID, req.Email)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &AuthResponse{
		Token: token,
		User:  UserInfo{ID: userID, Email: req.Email, Name: req.Name},
	}, nil
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	userID, name, hashedPassword, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Run a dummy bcrypt comparison to equalise timing regardless of
			// whether the email exists — prevents user-enumeration via timing.
			_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(req.Password))
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("lookup user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Non-fatal — a failure here doesn't prevent login.
	if err := s.repo.UpdateLastActive(ctx, userID); err != nil {
		slog.Warn("failed to update last_active_at on login", "user_id", userID, "error", err)
	}

	token, err := generateToken(userID, req.Email)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &AuthResponse{
		Token: token,
		User:  UserInfo{ID: userID, Email: req.Email, Name: name},
	}, nil
}

func (s *service) GetMe(ctx context.Context, userID string) (*User, error) {
	u, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get me: %w", err)
	}
	return u, nil
}

func (s *service) UpdateMe(ctx context.Context, userID, name string) (*User, error) {
	if err := s.repo.UpdateUserName(ctx, userID, name); err != nil {
		return nil, fmt.Errorf("update me: %w", err)
	}
	u, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get updated user: %w", err)
	}
	return u, nil
}

func (s *service) DeleteMe(ctx context.Context, userID string) error {
	if err := s.repo.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("delete me: %w", err)
	}
	return nil
}

func (s *service) ActivateTrial(ctx context.Context, userID string) (time.Time, error) {
	subType, err := s.repo.GetSubscriptionType(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, ErrUserNotFound
		}
		return time.Time{}, fmt.Errorf("get subscription type: %w", err)
	}
	if subType != "free" {
		return time.Time{}, ErrTrialNotAvailable
	}
	expiresAt, err := s.repo.ActivateTrial(ctx, userID)
	if err != nil {
		return time.Time{}, fmt.Errorf("activate trial: %w", err)
	}
	return expiresAt, nil
}

func (s *service) UpdateAIEnabled(ctx context.Context, userID string, enabled bool) error {
	return s.repo.UpdateAIEnabled(ctx, userID, enabled)
}

func (s *service) GetAIEnabled(ctx context.Context, userID string) (bool, error) {
	enabled, err := s.repo.GetAIEnabled(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, ErrUserNotFound
		}
		return false, fmt.Errorf("get ai enabled: %w", err)
	}
	return enabled, nil
}

func (s *service) RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error {
	return s.repo.RevokeToken(ctx, jti, expiresAt)
}

// generateToken issues a 24-hour JWT with a unique jti claim.
// The jti enables explicit revocation on account deletion.
func generateToken(userID, email string) (string, error) {
	jti, err := newJTI()
	if err != nil {
		return "", fmt.Errorf("generate jti: %w", err)
	}
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"jti":   jti,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.JWTSecret()))
}

// newJTI generates a random UUID v4 string for use as a JWT ID claim.
func newJTI() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant bits
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}
