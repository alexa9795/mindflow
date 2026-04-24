package auth

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"time"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/subscription"
)

// Handler holds the HTTP handlers for auth endpoints.
type Handler struct {
	svc    Service
	subSvc subscription.Service
	audit  *audit.Logger
}

// NewHandler returns a Handler backed by the given Service, subscription Service,
// and audit Logger (may be nil — no audit events emitted).
func NewHandler(svc Service, subSvc subscription.Service, auditLogger *audit.Logger) *Handler {
	return &Handler{svc: svc, subSvc: subSvc, audit: auditLogger}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Email, password and name are required"))
		return
	}
	if len(req.Email) > 254 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Email address is too long"))
		return
	}
	if !isValidEmail(req.Email) {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid email address"))
		return
	}
	if len(req.Password) < 8 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Password must be at least 8 characters"))
		return
	}
	if len(req.Password) > 72 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Password must be 72 characters or less"))
		return
	}

	resp, err := h.svc.Register(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrEmailExists) {
			api.WriteError(w, api.ErrConflict.WithMessage("Email already exists"))
			return
		}
		slog.Error("register error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	// Log domain only — never the full email address.
	domain := req.Email
	if parts := strings.SplitN(req.Email, "@", 2); len(parts) == 2 {
		domain = parts[1]
	}
	h.audit.Log(r.Context(), &resp.User.ID, audit.ActionRegister, audit.IPFromRequest(r),
		map[string]any{"email_domain": domain})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handler) PatchMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	if body.Name == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Name is required"))
		return
	}
	if len(body.Name) > 50 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Name must be 50 characters or less"))
		return
	}

	user, err := h.svc.UpdateMe(r.Context(), userID, body.Name)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		slog.Error("patch me error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionUpdateName, audit.IPFromRequest(r), nil)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	jti, _ := r.Context().Value(middleware.JTIKey).(string)
	tokenExpiry, _ := r.Context().Value(middleware.TokenExpiryKey).(time.Time)

	if err := h.svc.DeleteMe(r.Context(), userID); err != nil {
		slog.Error("delete me error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionDeleteAccount, audit.IPFromRequest(r), nil)

	// Revoke the JWT so it cannot be replayed within its remaining 24-hour window.
	if jti != "" && !tokenExpiry.IsZero() {
		if err := h.svc.RevokeToken(r.Context(), jti, tokenExpiry); err != nil {
			slog.Error("token revocation failed after account deletion", "jti", jti, "error", err)
			// Non-fatal: the user row is already deleted; any replay returns 404.
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	user, err := h.svc.GetMe(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		slog.Error("get me error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	subStatus, err := h.subSvc.CheckSubscription(r.Context(), userID)
	if err != nil {
		slog.Error("subscription check error in me", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}
	user.Subscription = &SubscriptionInfo{
		Tier:        string(subStatus.Tier),
		IsActive:    subStatus.IsActive,
		EntriesUsed: subStatus.EntriesUsed,
		Limit:       subStatus.Limit,
		ExpiresAt:   subStatus.ExpiresAt,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h *Handler) Trial(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	expiresAt, err := h.svc.ActivateTrial(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrTrialNotAvailable) {
			api.WriteError(w, api.ErrTrialNotAvailable)
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		slog.Error("activate trial error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionTrialActivated, audit.IPFromRequest(r), nil)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"tier":       "trial",
		"expires_at": expiresAt,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	if len(req.Email) > 254 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Email address is too long"))
		return
	}
	if !isValidEmail(req.Email) {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid email address"))
		return
	}
	if len(req.Password) > 72 {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Password must be 72 characters or less"))
		return
	}

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			// Do not distinguish wrong password vs unknown email in the audit log
			// — distinguishing them leaks whether an email is registered.
			h.audit.Log(r.Context(), nil, audit.ActionLoginFailure, audit.IPFromRequest(r), nil)
			api.WriteError(w, api.ErrUnauthorized.WithMessage("Invalid credentials"))
			return
		}
		slog.Error("login error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &resp.User.ID, audit.ActionLoginSuccess, audit.IPFromRequest(r), nil)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// AIToggle handles PATCH /api/auth/ai-toggle.
// It enables or disables AI responses for the authenticated user.
// When disabled, journal entries are never sent to the Anthropic API.
func (h *Handler) AIToggle(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	var body struct {
		AIEnabled bool `json:"ai_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}

	if err := h.svc.UpdateAIEnabled(r.Context(), userID, body.AIEnabled); err != nil {
		slog.Error("ai toggle error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionUpdateAIToggle, audit.IPFromRequest(r),
		map[string]any{"ai_enabled": body.AIEnabled})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ai_enabled": body.AIEnabled})
}

// TODO: Password reset flow is required before public launch. It needs an email
// sending infrastructure (SMTP / transactional email service). When implemented,
// add POST /api/auth/forgot-password and POST /api/auth/reset-password endpoints
// with time-limited, single-use tokens stored in a dedicated table.

// isValidEmail checks that email is a valid RFC 5322 address and nothing more
// (rejects display-name wrappers like "Name <email>").
func isValidEmail(email string) bool {
	a, err := mail.ParseAddress(email)
	return err == nil && a.Address == email
}
