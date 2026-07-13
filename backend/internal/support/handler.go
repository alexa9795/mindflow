package support

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/middleware"
)

// maxMessageLength caps the issue-report body to something a support inbox
// can reasonably handle — same order of magnitude as other free-text fields.
const maxMessageLength = 5000

// Handler holds the HTTP handler for the "report an issue" endpoint.
type Handler struct {
	svc   Service
	audit *audit.Logger
}

// NewHandler returns a Handler backed by the given Service and audit Logger (may be nil).
func NewHandler(svc Service, auditLogger *audit.Logger) *Handler {
	return &Handler{svc: svc, audit: auditLogger}
}

// ReportIssue handles POST /api/support/report-issue.
func (h *Handler) ReportIssue(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	var body struct {
		Message    string `json:"message"`
		AppVersion string `json:"app_version"`
		Platform   string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	body.Message = strings.TrimSpace(body.Message)
	if body.Message == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Message is required"))
		return
	}
	if len(body.Message) > maxMessageLength {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Message must be 5000 characters or less"))
		return
	}

	if err := h.svc.ReportIssue(r.Context(), userID, body.Message, body.AppVersion, body.Platform); err != nil {
		if errors.Is(err, ErrEmailUnavailable) {
			api.WriteError(w, api.ErrEmailUnavailable)
			return
		}
		slog.Error("report issue error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionIssueReported, audit.IPFromRequest(r), nil)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
