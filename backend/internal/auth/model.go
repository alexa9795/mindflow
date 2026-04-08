package auth

import (
	"errors"
	"time"
)

// RegisterRequest is the payload for POST /api/auth/register.
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// LoginRequest is the payload for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse is returned on successful register or login.
type AuthResponse struct {
	Token string   `json:"token"`
	User  UserInfo `json:"user"`
}

// UserInfo is the public user representation included in AuthResponse.
type UserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// User is the response shape for GET /api/auth/me.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	// ErrEmailExists is returned when registration fails due to a duplicate email.
	ErrEmailExists = errors.New("email already exists")
	// ErrInvalidCredentials is returned when login credentials do not match.
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrUserNotFound is returned when the requested user does not exist.
	ErrUserNotFound = errors.New("user not found")
)
