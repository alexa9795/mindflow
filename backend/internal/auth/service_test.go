package auth

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-jwt-secret-for-unit-tests")
	os.Exit(m.Run())
}

// mockAuthRepo is a controllable in-memory Repository for service tests.
type mockAuthRepo struct {
	users      map[string]*User
	byEmail    map[string]mockEmailEntry
	createErr  error
	subType    string
	trialAt    time.Time
}

type mockEmailEntry struct {
	id, name, hash string
}

func newMockAuthRepo() *mockAuthRepo {
	return &mockAuthRepo{
		users:   make(map[string]*User),
		byEmail: make(map[string]mockEmailEntry),
		subType: "free",
	}
}

func (m *mockAuthRepo) addUser(id, email, name, hash string) {
	m.users[id] = &User{ID: id, Email: email, Name: name, CreatedAt: time.Now()}
	m.byEmail[email] = mockEmailEntry{id, name, hash}
}

func (m *mockAuthRepo) CreateUser(_ context.Context, email, name, passwordHash string) (string, error) {
	if m.createErr != nil {
		return "", m.createErr
	}
	id := "new-user-id"
	m.users[id] = &User{ID: id, Email: email, Name: name, CreatedAt: time.Now()}
	m.byEmail[email] = mockEmailEntry{id, name, passwordHash}
	return id, nil
}

func (m *mockAuthRepo) GetUserByEmail(_ context.Context, email string) (id, name, hash string, err error) {
	if e, ok := m.byEmail[email]; ok {
		return e.id, e.name, e.hash, nil
	}
	return "", "", "", sql.ErrNoRows
}

func (m *mockAuthRepo) GetUserByID(_ context.Context, id string) (*User, error) {
	if u, ok := m.users[id]; ok {
		cp := *u
		return &cp, nil
	}
	return nil, sql.ErrNoRows
}

func (m *mockAuthRepo) UpdateUserName(_ context.Context, id, name string) error {
	if u, ok := m.users[id]; ok {
		u.Name = name
		return nil
	}
	return sql.ErrNoRows
}

func (m *mockAuthRepo) DeleteUser(_ context.Context, id string) error {
	delete(m.users, id)
	return nil
}

func (m *mockAuthRepo) GetSubscriptionType(_ context.Context, userID string) (string, error) {
	if _, ok := m.users[userID]; !ok {
		return "", sql.ErrNoRows
	}
	return m.subType, nil
}

func (m *mockAuthRepo) ActivateTrial(_ context.Context, _ string) (time.Time, error) {
	return m.trialAt, nil
}

// ---- Register tests --------------------------------------------------------

func TestRegister(t *testing.T) {
	tests := []struct {
		name      string
		req       RegisterRequest
		createErr error
		wantErr   error
		wantToken bool
	}{
		{
			name:      "valid input creates user and returns token",
			req:       RegisterRequest{Email: "alice@example.com", Password: "password123", Name: "Alice"},
			wantToken: true,
		},
		{
			name:      "duplicate email returns ErrEmailExists",
			req:       RegisterRequest{Email: "dupe@example.com", Password: "password123", Name: "Dupe"},
			createErr: &pq.Error{Code: "23505"},
			wantErr:   ErrEmailExists,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := newMockAuthRepo()
			r.createErr = tc.createErr
			svc := NewService(r)

			resp, err := svc.Register(context.Background(), tc.req)

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Errorf("got error %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantToken && resp.Token == "" {
				t.Error("expected non-empty JWT token")
			}
			if resp.User.Email != tc.req.Email {
				t.Errorf("user email = %q, want %q", resp.User.Email, tc.req.Email)
			}
		})
	}
}

// ---- Login tests -----------------------------------------------------------

func TestLogin(t *testing.T) {
	correctHash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		panic(err)
	}

	r := newMockAuthRepo()
	r.addUser("uid-1", "user@example.com", "User One", string(correctHash))
	svc := NewService(r)

	tests := []struct {
		name    string
		email   string
		pass    string
		wantErr error
	}{
		{
			name:  "valid credentials returns token",
			email: "user@example.com",
			pass:  "correct-password",
		},
		{
			name:    "unknown email returns ErrInvalidCredentials (not ErrUserNotFound)",
			email:   "nobody@example.com",
			pass:    "anything",
			wantErr: ErrInvalidCredentials,
		},
		{
			name:    "wrong password returns ErrInvalidCredentials",
			email:   "user@example.com",
			pass:    "wrong-password",
			wantErr: ErrInvalidCredentials,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := svc.Login(context.Background(), LoginRequest{Email: tc.email, Password: tc.pass})

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Errorf("got error %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if resp.Token == "" {
				t.Error("expected non-empty JWT token")
			}
		})
	}
}

// ---- GetMe tests -----------------------------------------------------------

func TestGetMe(t *testing.T) {
	r := newMockAuthRepo()
	r.addUser("uid-2", "me@example.com", "Me User", "hash")
	svc := NewService(r)

	tests := []struct {
		name    string
		userID  string
		wantErr error
	}{
		{
			name:   "known user returns profile",
			userID: "uid-2",
		},
		{
			name:    "unknown user returns ErrUserNotFound",
			userID:  "nonexistent",
			wantErr: ErrUserNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			user, err := svc.GetMe(context.Background(), tc.userID)

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Errorf("got error %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if user.ID != tc.userID {
				t.Errorf("user.ID = %q, want %q", user.ID, tc.userID)
			}
		})
	}
}

// ---- UpdateMe tests --------------------------------------------------------

func TestUpdateMe(t *testing.T) {
	r := newMockAuthRepo()
	r.addUser("uid-3", "update@example.com", "Old Name", "hash")
	svc := NewService(r)

	tests := []struct {
		name    string
		userID  string
		newName string
		wantErr bool
	}{
		{
			name:    "valid name updates and returns user",
			userID:  "uid-3",
			newName: "New Name",
		},
		{
			name:    "unknown userID returns error",
			userID:  "ghost",
			newName: "Name",
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			user, err := svc.UpdateMe(context.Background(), tc.userID, tc.newName)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if user.Name != tc.newName {
				t.Errorf("name = %q, want %q", user.Name, tc.newName)
			}
		})
	}
}

// ---- ActivateTrial tests ---------------------------------------------------

func TestActivateTrial(t *testing.T) {
	r := newMockAuthRepo()
	r.addUser("uid-4", "trial@example.com", "Trial User", "hash")
	r.trialAt = time.Now().Add(7 * 24 * time.Hour)
	svc := NewService(r)

	tests := []struct {
		name    string
		userID  string
		subType string
		wantErr error
	}{
		{
			name:    "free user activates trial",
			userID:  "uid-4",
			subType: "free",
		},
		{
			name:    "non-free user cannot activate trial",
			userID:  "uid-4",
			subType: "monthly",
			wantErr: ErrTrialNotAvailable,
		},
		{
			name:    "unknown user returns ErrUserNotFound",
			userID:  "ghost",
			subType: "free",
			wantErr: ErrUserNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r.subType = tc.subType
			expiresAt, err := svc.ActivateTrial(context.Background(), tc.userID)

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Errorf("got error %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if expiresAt.IsZero() {
				t.Error("expected non-zero expiry time")
			}
		})
	}
}
