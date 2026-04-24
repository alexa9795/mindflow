package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/alexa9795/mindflow/internal/config"
	"github.com/alexa9795/mindflow/internal/email"
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
	SetAIConsent(ctx context.Context, userID string) error
	// Password reset.
	RequestPasswordReset(ctx context.Context, emailAddr string) error
	ResetPassword(ctx context.Context, token, newPassword string) error
	// Refresh token rotation.
	RefreshTokens(ctx context.Context, rawRefreshToken string) (*AuthTokens, error)
}

type service struct {
	repo        Repository
	emailClient *email.Client
}

// NewService returns an auth Service backed by the given Repository.
// emailClient may be nil — password reset emails will be skipped with a warning.
func NewService(repo Repository, emailClient *email.Client) Service {
	return &service{repo: repo, emailClient: emailClient}
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

	tokens, err := s.generateTokenPair(ctx, userID, req.Email)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}

	return &AuthResponse{
		AuthTokens: *tokens,
		User:       UserInfo{ID: userID, Email: req.Email, Name: req.Name},
	}, nil
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	userID, name, hashedPassword, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
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

	tokens, err := s.generateTokenPair(ctx, userID, req.Email)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}

	return &AuthResponse{
		AuthTokens: *tokens,
		User:       UserInfo{ID: userID, Email: req.Email, Name: name},
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
	if err := s.repo.RevokeAllUserRefreshTokens(ctx, userID); err != nil {
		slog.Warn("failed to revoke refresh tokens on account deletion", "user_id", userID, "error", err)
	}
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
	if err := s.repo.UpdateAIEnabled(ctx, userID, enabled); err != nil {
		return err
	}
	// Record consent timestamp when enabling for the first time.
	if enabled {
		if err := s.repo.SetAIConsent(ctx, userID); err != nil {
			slog.Warn("failed to set ai_consent_given_at", "user_id", userID, "error", err)
		}
	}
	return nil
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

func (s *service) SetAIConsent(ctx context.Context, userID string) error {
	return s.repo.SetAIConsent(ctx, userID)
}

// RequestPasswordReset generates a reset token and sends a reset email.
// Always returns nil even if the email is not found — prevents email enumeration.
// DB errors are logged internally but never surfaced to the caller.
func (s *service) RequestPasswordReset(ctx context.Context, emailAddr string) error {
	userID, _, _, err := s.repo.GetUserByEmail(ctx, emailAddr)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			slog.Error("password reset: lookup user failed", "error", err)
		}
		return nil
	}

	rawToken, err := generateSecureToken()
	if err != nil {
		slog.Error("password reset: generate token failed", "error", err)
		return nil
	}

	tokenHash := sha256Hex(rawToken)
	expiresAt := time.Now().Add(30 * time.Minute)
	if err := s.repo.SetResetToken(ctx, userID, tokenHash, expiresAt); err != nil {
		slog.Error("password reset: set token failed", "user_id", userID, "error", err)
		return nil
	}

	if s.emailClient != nil {
		u, err := s.repo.GetUserByID(ctx, userID)
		if err != nil {
			slog.Error("password reset: get user for email failed", "user_id", userID, "error", err)
			return nil
		}
		if err := s.emailClient.SendPasswordReset(ctx, emailAddr, u.Name, rawToken); err != nil {
			slog.Warn("password reset: failed to send email", "user_id", userID, "error", err)
		}
	}
	return nil
}

// ResetPassword validates a reset token and updates the password.
func (s *service) ResetPassword(ctx context.Context, token, newPassword string) error {
	tokenHash := sha256Hex(token)
	u, err := s.repo.GetUserByResetToken(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidResetToken
		}
		return fmt.Errorf("get user by reset token: %w", err)
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	if err := s.repo.UpdatePassword(ctx, u.ID, string(hashed)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	if err := s.repo.ClearResetToken(ctx, u.ID); err != nil {
		slog.Warn("failed to clear reset token", "user_id", u.ID, "error", err)
	}

	if err := s.repo.RevokeAllUserRefreshTokens(ctx, u.ID); err != nil {
		slog.Warn("failed to revoke refresh tokens after password reset", "user_id", u.ID, "error", err)
	}

	return nil
}

// RefreshTokens validates a refresh token, rotates it, and returns new tokens.
func (s *service) RefreshTokens(ctx context.Context, rawRefreshToken string) (*AuthTokens, error) {
	tokenHash := sha256Hex(rawRefreshToken)

	rt, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvalidRefreshToken
		}
		return nil, fmt.Errorf("get refresh token: %w", err)
	}

	u, err := s.repo.GetUserByID(ctx, rt.UserID)
	if err != nil {
		return nil, fmt.Errorf("get user for refresh: %w", err)
	}

	// Revoke the old refresh token before issuing a new one (rotation).
	if err := s.repo.RevokeRefreshToken(ctx, rt.ID); err != nil {
		return nil, fmt.Errorf("revoke old refresh token: %w", err)
	}

	tokens, err := s.generateTokenPair(ctx, u.ID, u.Email)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}

	return tokens, nil
}

// generateTokenPair creates a 15-minute access JWT and a 7-day refresh token,
// persists the refresh token hash, and returns both.
func (s *service) generateTokenPair(ctx context.Context, userID, emailAddr string) (*AuthTokens, error) {
	accessExpiry := time.Now().Add(15 * time.Minute)
	jti, err := newJTI()
	if err != nil {
		return nil, fmt.Errorf("generate jti: %w", err)
	}
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": emailAddr,
		"jti":   jti,
		"exp":   accessExpiry.Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString([]byte(config.JWTSecret()))
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}

	rawRefresh, err := generateSecureToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	refreshHash := sha256Hex(rawRefresh)
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)

	if err := s.repo.CreateRefreshToken(ctx, userID, refreshHash, refreshExpiry); err != nil {
		return nil, fmt.Errorf("store refresh token: %w", err)
	}

	return &AuthTokens{
		AccessToken:           accessToken,
		RefreshToken:          rawRefresh,
		AccessTokenExpiresAt:  accessExpiry,
		RefreshTokenExpiresAt: refreshExpiry,
		UserID:                userID,
	}, nil
}

// generateSecureToken returns a cryptographically random 32-byte token, base64url encoded.
func generateSecureToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// sha256Hex returns the SHA-256 hex digest of s.
func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
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
