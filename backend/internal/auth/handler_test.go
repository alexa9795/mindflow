package auth_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alexa9795/mindflow/internal/auth"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/subscription"
)

// ---- Mocks ----------------------------------------------------------------

type mockAuthSvc struct {
	regResp    *auth.AuthResponse
	regErr     error
	loginResp  *auth.AuthResponse
	loginErr   error
	getMeResp  *auth.User
	getMeErr   error
	updateResp *auth.User
	updateErr  error
}

func (m *mockAuthSvc) Register(_ context.Context, _ auth.RegisterRequest) (*auth.AuthResponse, error) {
	return m.regResp, m.regErr
}
func (m *mockAuthSvc) Login(_ context.Context, _ auth.LoginRequest) (*auth.AuthResponse, error) {
	return m.loginResp, m.loginErr
}
func (m *mockAuthSvc) GetMe(_ context.Context, _ string) (*auth.User, error) {
	return m.getMeResp, m.getMeErr
}
func (m *mockAuthSvc) UpdateMe(_ context.Context, _, _ string) (*auth.User, error) {
	return m.updateResp, m.updateErr
}
func (m *mockAuthSvc) DeleteMe(_ context.Context, _ string) error { return nil }
func (m *mockAuthSvc) ActivateTrial(_ context.Context, _ string) (time.Time, error) {
	return time.Time{}, nil
}

type mockSubSvcForHandler struct {
	status *subscription.SubscriptionStatus
	err    error
}

func (m *mockSubSvcForHandler) CheckSubscription(_ context.Context, _ string) (*subscription.SubscriptionStatus, error) {
	return m.status, m.err
}

// ---- Helpers ---------------------------------------------------------------

var defaultSubStatus = &subscription.SubscriptionStatus{
	Tier:     subscription.TierFree,
	IsActive: true,
	Limit:    10,
	CanPost:  true,
}

func newHandler(svc auth.Service, subSvc subscription.Service) *auth.Handler {
	return auth.NewHandler(svc, subSvc)
}

// ---- POST /api/auth/register -----------------------------------------------

func TestRegisterHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		svcErr     error
		wantStatus int
		wantCode   string
	}{
		{
			name:       "valid body returns 201",
			body:       `{"email":"a@b.com","password":"password1","name":"Alice"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "missing email returns 400",
			body:       `{"password":"password1","name":"Alice"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password returns 400",
			body:       `{"email":"a@b.com","name":"Alice"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "duplicate email returns 409",
			body:       `{"email":"a@b.com","password":"password1","name":"Alice"}`,
			svcErr:     auth.ErrEmailExists,
			wantStatus: http.StatusConflict,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{invalid}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "password over 72 chars returns 400",
			body:       `{"email":"a@b.com","password":"` + strings.Repeat("x", 73) + `","name":"Alice"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{
				regResp: &auth.AuthResponse{Token: "tok", User: auth.UserInfo{ID: "1", Email: "a@b.com", Name: "Alice"}},
				regErr:  tc.svcErr,
			}
			h := newHandler(svc, &mockSubSvcForHandler{status: defaultSubStatus})

			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			h.Register(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
		})
	}
}

// ---- POST /api/auth/login --------------------------------------------------

func TestLoginHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		svcErr     error
		wantStatus int
	}{
		{
			name:       "valid credentials returns 200",
			body:       `{"email":"a@b.com","password":"pass"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid credentials returns 401",
			body:       `{"email":"a@b.com","password":"wrong"}`,
			svcErr:     auth.ErrInvalidCredentials,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{bad json`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{
				loginResp: &auth.AuthResponse{Token: "tok", User: auth.UserInfo{ID: "1", Email: "a@b.com"}},
				loginErr:  tc.svcErr,
			}
			h := newHandler(svc, &mockSubSvcForHandler{status: defaultSubStatus})

			req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			h.Login(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
		})
	}
}

// ---- GET /api/auth/me ------------------------------------------------------

func TestMeHandler(t *testing.T) {
	user := &auth.User{ID: "uid-1", Email: "me@example.com", Name: "Me"}

	tests := []struct {
		name       string
		setUserID  bool
		getMeErr   error
		wantStatus int
		wantSubKey bool
	}{
		{
			name:       "valid userID in context returns 200 with subscription",
			setUserID:  true,
			wantStatus: http.StatusOK,
			wantSubKey: true,
		},
		{
			name:       "missing userID in context returns 401",
			setUserID:  false,
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{getMeResp: user, getMeErr: tc.getMeErr}
			subSvc := &mockSubSvcForHandler{status: defaultSubStatus}
			h := newHandler(svc, subSvc)

			req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
			if tc.setUserID {
				ctx := context.WithValue(req.Context(), middleware.UserIDKey, "uid-1")
				req = req.WithContext(ctx)
			}
			rr := httptest.NewRecorder()
			h.Me(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if tc.wantSubKey {
				var body map[string]interface{}
				if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if _, ok := body["subscription"]; !ok {
					t.Error("response missing 'subscription' field")
				}
			}
		})
	}
}

// ---- Error type assertions -------------------------------------------------

func TestRegisterErrorMapping(t *testing.T) {
	// Verify that ErrEmailExists is distinct from other error types
	err := auth.ErrEmailExists
	if !errors.Is(err, auth.ErrEmailExists) {
		t.Error("ErrEmailExists identity check failed")
	}
	if errors.Is(err, auth.ErrInvalidCredentials) {
		t.Error("ErrEmailExists must not equal ErrInvalidCredentials")
	}
}
