package middleware_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/subscription"
)

type mockSubSvc struct {
	status *subscription.SubscriptionStatus
	err    error
}

func (m *mockSubSvc) CheckSubscription(_ context.Context, _ string) (*subscription.SubscriptionStatus, error) {
	return m.status, m.err
}

func makeNext(called *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*called = true
		w.WriteHeader(http.StatusOK)
	})
}

func reqWithUserID(userID string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/api/entries", nil)
	if userID != "" {
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)
	}
	return req
}

func TestCheckSubscriptionMiddleware(t *testing.T) {
	tests := []struct {
		name        string
		userID      string
		status      *subscription.SubscriptionStatus
		svcErr      error
		wantStatus  int
		wantNextCalled bool
		wantErrCode string
	}{
		{
			name:           "CanPost true passes through to next handler",
			userID:         "user-1",
			status:         &subscription.SubscriptionStatus{CanPost: true},
			wantStatus:     http.StatusOK,
			wantNextCalled: true,
		},
		{
			name:        "CanPost false returns 403 with SUBSCRIPTION_LIMIT_REACHED",
			userID:      "user-1",
			status:      &subscription.SubscriptionStatus{CanPost: false},
			wantStatus:  http.StatusForbidden,
			wantErrCode: "SUBSCRIPTION_LIMIT_REACHED",
		},
		{
			name:       "service error returns 500",
			userID:     "user-1",
			svcErr:     errors.New("db unavailable"),
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "missing userID in context returns 401",
			userID:     "",
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockSubSvc{status: tc.status, err: tc.svcErr}
			nextCalled := false
			handler := middleware.CheckSubscription(svc)(makeNext(&nextCalled))

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, reqWithUserID(tc.userID))

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if tc.wantNextCalled && !nextCalled {
				t.Error("expected next handler to be called, but it wasn't")
			}
			if !tc.wantNextCalled && nextCalled {
				t.Error("expected next handler NOT to be called, but it was")
			}
			if tc.wantErrCode != "" {
				var body struct {
					Error struct {
						Code string `json:"code"`
					} `json:"error"`
				}
				if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if body.Error.Code != tc.wantErrCode {
					t.Errorf("error code = %q, want %q", body.Error.Code, tc.wantErrCode)
				}
			}
		})
	}
}
