package entry

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/middleware"
)

// Handler holds the HTTP handlers for entry endpoints.
type Handler struct {
	svc   Service
	audit *audit.Logger
}

// NewHandler returns a Handler backed by the given Service and audit Logger
// (may be nil — no audit events emitted).
func NewHandler(svc Service, auditLogger *audit.Logger) *Handler {
	return &Handler{svc: svc, audit: auditLogger}
}

type createRequest struct {
	Content   string `json:"content"`
	MoodScore *int   `json:"mood_score"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	if req.Content == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Content is required"))
		return
	}
	const maxEntryLength = 10000
	if len(req.Content) > maxEntryLength {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Entry is too long (max 10,000 characters)"))
		return
	}
	if req.MoodScore != nil && (*req.MoodScore < 1 || *req.MoodScore > 5) {
		api.WriteError(w, api.ErrBadRequest.WithMessage("mood_score must be between 1 and 5"))
		return
	}

	e, err := h.svc.Create(r.Context(), userID, req.Content, req.MoodScore)
	if err != nil {
		slog.Error("create entry error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(e)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	page, limit := 1, 20
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	entries, total, err := h.svc.List(r.Context(), userID, page, limit)
	if err != nil {
		slog.Error("list entries error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"entries": entries,
		"page":    page,
		"limit":   limit,
		"total":   total,
	})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}
	entryID := r.PathValue("id")

	e, err := h.svc.Get(r.Context(), entryID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		slog.Error("get entry error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(e)
}

func (h *Handler) Respond(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}
	entryID := r.PathValue("id")

	msg, isNew, err := h.svc.Respond(r.Context(), entryID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		if errors.Is(err, ErrAIDisabled) {
			api.WriteError(w, api.ErrAIDisabled)
			return
		}
		if errors.Is(err, ErrAIUnavailable) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"ai_error":         true,
				"ai_error_message": "AI is temporarily unavailable. Your entry has been saved.",
			})
			return
		}
		slog.Error("respond error", "error", err)
		api.WriteError(w, api.ErrInternalServer.WithMessage("Failed to generate AI response"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if isNew {
		w.WriteHeader(http.StatusCreated)
	} else {
		w.WriteHeader(http.StatusOK)
	}
	_ = json.NewEncoder(w).Encode(msg)
}

func (h *Handler) AddMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}
	entryID := r.PathValue("id")

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid request body"))
		return
	}
	if req.Content == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Content is required"))
		return
	}
	const maxMessageLength = 2000
	if len(req.Content) > maxMessageLength {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Message must be 2000 characters or less"))
		return
	}

	userMsg, aiMsg, aiError, err := h.svc.AddMessage(r.Context(), entryID, userID, req.Content)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		if errors.Is(err, ErrAIDisabled) {
			api.WriteError(w, api.ErrAIDisabled)
			return
		}
		slog.Error("add message error", "error", err)
		api.WriteError(w, api.ErrInternalServer.WithMessage("Failed to generate AI response"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if aiError {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ai_error":         true,
			"ai_error_message": "AI is temporarily unavailable. Please try again.",
		})
		return
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"user_message":      userMsg,
		"assistant_message": aiMsg,
	})
}

func (h *Handler) DeleteAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	if err := h.svc.DeleteAll(r.Context(), userID); err != nil {
		slog.Error("delete all entries error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionDeleteEntries, audit.IPFromRequest(r), nil)
	w.WriteHeader(http.StatusNoContent)
}
