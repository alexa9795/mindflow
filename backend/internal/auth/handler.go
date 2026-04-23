package auth

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/alexa9795/mindflow/internal/subscription"
)

// Handler holds the HTTP handlers for auth endpoints.
type Handler struct {
	svc    Service
	subSvc *subscription.Service
}

// NewHandler returns a Handler backed by the given Service and subscription Service.
func NewHandler(svc Service, subSvc *subscription.Service) *Handler {
	return &Handler{svc: svc, subSvc: subSvc}
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
		log.Printf("register error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

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

	user, err := h.svc.UpdateMe(r.Context(), userID, body.Name)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		log.Printf("patch me error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	if err := h.svc.DeleteMe(r.Context(), userID); err != nil {
		log.Printf("delete me error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
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
		log.Printf("get me error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	subStatus, err := h.subSvc.CheckSubscription(r.Context(), userID)
	if err != nil {
		log.Printf("subscription check error in me: %v", err)
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
		log.Printf("activate trial error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

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
			api.WriteError(w, api.ErrUnauthorized.WithMessage("Invalid credentials"))
			return
		}
		log.Printf("login error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func isValidEmail(email string) bool {
	at := strings.Index(email, "@")
	if at < 1 {
		return false
	}
	dot := strings.LastIndex(email[at:], ".")
	return dot > 1 && dot < len(email[at:])-1
}
