package support_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/support"
)

type mockSupportSvc struct {
	err error
}

func (m *mockSupportSvc) ReportIssue(_ context.Context, _, _, _, _ string) error {
	return m.err
}

func TestReportIssueHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		setUserID  bool
		svcErr     error
		wantStatus int
	}{
		{
			name:       "valid message with userID returns 200",
			body:       `{"message":"the export button does nothing"}`,
			setUserID:  true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "missing userID in context returns 401",
			body:       `{"message":"hello"}`,
			setUserID:  false,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "empty message returns 400",
			body:       `{"message":"   "}`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "malformed JSON returns 400",
			body:       `{bad`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "message over 5000 chars returns 400",
			body:       `{"message":"` + strings.Repeat("a", 5001) + `"}`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "email unavailable returns 503",
			body:       `{"message":"hello"}`,
			setUserID:  true,
			svcErr:     support.ErrEmailUnavailable,
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:       "unexpected service error returns 500",
			body:       `{"message":"hello"}`,
			setUserID:  true,
			svcErr:     context.DeadlineExceeded,
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := support.NewHandler(&mockSupportSvc{err: tc.svcErr}, nil)

			req := httptest.NewRequest(http.MethodPost, "/api/support/report-issue", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			if tc.setUserID {
				ctx := context.WithValue(req.Context(), middleware.UserIDKey, "uid-1")
				req = req.WithContext(ctx)
			}
			rr := httptest.NewRecorder()
			h.ReportIssue(rr, req)

			if rr.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if tc.wantStatus == http.StatusOK {
				var body map[string]bool
				if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if !body["success"] {
					t.Error("expected success: true")
				}
			}
		})
	}
}
