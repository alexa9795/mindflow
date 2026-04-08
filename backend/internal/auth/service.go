package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Service is the business-logic interface for authentication.
type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	GetMe(ctx context.Context, userID string) (*User, error)
	UpdateMe(ctx context.Context, userID, name string) (*User, error)
	DeleteMe(ctx context.Context, userID string) error
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

	trialEndsAt := time.Now().Add(7 * 24 * time.Hour)
	userID, err := s.repo.CreateUser(ctx, req.Email, req.Name, string(hashed), trialEndsAt)
	if err != nil {
		// Any DB error on insert is treated as a duplicate-email conflict; the
		// unique constraint is the only expected failure path here.
		return nil, ErrEmailExists
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
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("lookup user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
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

func generateToken(userID, email string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev_secret_change_in_production"
	}

	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
