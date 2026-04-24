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
	regResp      *auth.AuthResponse
	regErr       error
	loginResp    *auth.AuthResponse
	loginErr     error
	getMeResp    *auth.User
	getMeErr     error
	updateResp   *auth.User
	updateErr    error
	refreshResp  *auth.AuthTokens
	refreshErr   error
	resetPwErr   error
	aiToggleErr  error
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
func (m *mockAuthSvc) DeleteMe(_ context.Context, _ string) error           { return nil }
func (m *mockAuthSvc) ActivateTrial(_ context.Context, _ string) (time.Time, error) {
	return time.Time{}, nil
}
func (m *mockAuthSvc) UpdateAIEnabled(_ context.Context, _ string, _ bool) error { return m.aiToggleErr }
func (m *mockAuthSvc) GetAIEnabled(_ context.Context, _ string) (bool, error)    { return true, nil }
func (m *mockAuthSvc) RevokeToken(_ context.Context, _ string, _ time.Time) error { return nil }
func (m *mockAuthSvc) SetAIConsent(_ context.Context, _ string) error             { return nil }
func (m *mockAuthSvc) RequestPasswordReset(_ context.Context, _ string) error     { return nil }
func (m *mockAuthSvc) ResetPassword(_ context.Context, _, _ string) error         { return m.resetPwErr }
func (m *mockAuthSvc) RefreshTokens(_ context.Context, _ string) (*auth.AuthTokens, error) {
	return m.refreshResp, m.refreshErr
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
	return auth.NewHandler(svc, subSvc, nil, nil)
}

func makeAuthResponse() *auth.AuthResponse {
	return &auth.AuthResponse{
		AuthTokens: auth.AuthTokens{
			AccessToken:  "access-tok",
			RefreshToken: "refresh-tok",
		},
		User: auth.UserInfo{ID: "1", Email: "a@b.com", Name: "Alice"},
	}
}

// ---- POST /api/auth/register -----------------------------------------------

func TestRegisterHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		svcErr     error
		wantStatus int
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
			svc := &mockAuthSvc{regResp: makeAuthResponse(), regErr: tc.svcErr}
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
		{
			name:       "empty password returns 400",
			body:       `{"email":"a@b.com","password":""}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{loginResp: makeAuthResponse(), loginErr: tc.svcErr}
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
	user := &auth.User{ID: "uid-1", Email: "me@example.com", Name: "Me", AIEnabled: true}

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
				if _, ok := body["ai_enabled"]; !ok {
					t.Error("response missing 'ai_enabled' field")
				}
			}
		})
	}
}

// ---- POST /api/auth/refresh ------------------------------------------------

func TestRefreshHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		svcResp    *auth.AuthTokens
		svcErr     error
		wantStatus int
	}{
		{
			name: "valid refresh token returns 200 with new tokens",
			body: `{"refresh_token":"valid-raw-token"}`,
			svcResp: &auth.AuthTokens{
				AccessToken:  "new-access",
				RefreshToken: "new-refresh",
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid refresh token returns 401",
			body:       `{"refresh_token":"bad-token"}`,
			svcErr:     auth.ErrInvalidRefreshToken,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "missing refresh_token field returns 400",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{bad`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{refreshResp: tc.svcResp, refreshErr: tc.svcErr}
			h := newHandler(svc, &mockSubSvcForHandler{status: defaultSubStatus})

			req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			h.Refresh(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if tc.wantStatus == http.StatusOK {
				var body map[string]interface{}
				if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if body["access_token"] == "" {
					t.Error("response missing access_token")
				}
				if body["refresh_token"] == "" {
					t.Error("response missing refresh_token")
				}
			}
		})
	}
}

// ---- POST /api/auth/reset-password/confirm ---------------------------------

func TestConfirmPasswordResetHandler(t *testing.T) {
	longPw := strings.Repeat("x", 73)
	tests := []struct {
		name       string
		body       string
		svcErr     error
		wantStatus int
	}{
		{
			name:       "valid token and password returns 200",
			body:       `{"token":"valid-token","password":"newpass1"}`,
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid token returns 400",
			body:       `{"token":"bad-token","password":"newpass1"}`,
			svcErr:     auth.ErrInvalidResetToken,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing token returns 400",
			body:       `{"password":"newpass1"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password returns 400",
			body:       `{"token":"valid-token"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "password too short returns 400",
			body:       `{"token":"valid-token","password":"short"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "password too long returns 400",
			body:       `{"token":"valid-token","password":"` + longPw + `"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{bad`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{resetPwErr: tc.svcErr}
			h := newHandler(svc, &mockSubSvcForHandler{status: defaultSubStatus})

			req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password/confirm", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			h.ConfirmPasswordReset(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
		})
	}
}

// ---- PATCH /api/auth/ai-toggle ---------------------------------------------

func TestAIToggleHandler(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		setUserID   bool
		svcErr      error
		wantStatus  int
		wantEnabled *bool
	}{
		{
			name:       "enable AI with valid userID returns 200",
			body:       `{"ai_enabled":true}`,
			setUserID:  true,
			wantStatus: http.StatusOK,
			wantEnabled: func() *bool { b := true; return &b }(),
		},
		{
			name:       "disable AI with valid userID returns 200",
			body:       `{"ai_enabled":false}`,
			setUserID:  true,
			wantStatus: http.StatusOK,
			wantEnabled: func() *bool { b := false; return &b }(),
		},
		{
			name:       "missing userID in context returns 401",
			body:       `{"ai_enabled":true}`,
			setUserID:  false,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{bad`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "service error returns 500",
			body:       `{"ai_enabled":true}`,
			setUserID:  true,
			svcErr:     errors.New("db error"),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockAuthSvc{aiToggleErr: tc.svcErr}
			h := newHandler(svc, &mockSubSvcForHandler{status: defaultSubStatus})

			req := httptest.NewRequest(http.MethodPatch, "/api/auth/ai-toggle", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			if tc.setUserID {
				ctx := context.WithValue(req.Context(), middleware.UserIDKey, "uid-1")
				req = req.WithContext(ctx)
			}
			rr := httptest.NewRecorder()
			h.AIToggle(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if tc.wantEnabled != nil {
				var body map[string]interface{}
				if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				got, ok := body["ai_enabled"].(bool)
				if !ok {
					t.Fatalf("ai_enabled missing or not bool in response")
				}
				if got != *tc.wantEnabled {
					t.Errorf("ai_enabled = %v, want %v", got, *tc.wantEnabled)
				}
			}
		})
	}
}

// ---- Error type assertions -------------------------------------------------

func TestRegisterErrorMapping(t *testing.T) {
	err := auth.ErrEmailExists
	if !errors.Is(err, auth.ErrEmailExists) {
		t.Error("ErrEmailExists identity check failed")
	}
	if errors.Is(err, auth.ErrInvalidCredentials) {
		t.Error("ErrEmailExists must not equal ErrInvalidCredentials")
	}
}
