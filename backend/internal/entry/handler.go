package entry

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/middleware"
)

// Handler holds the HTTP handlers for entry endpoints.
type Handler struct {
	svc Service
}

// NewHandler returns a Handler backed by the given Service.
func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
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

	e, err := h.svc.Create(r.Context(), userID, req.Content, req.MoodScore)
	if err != nil {
		log.Printf("create entry error: %v", err)
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

	entries, err := h.svc.List(r.Context(), userID, page, limit)
	if err != nil {
		log.Printf("list entries error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"entries": entries,
		"page":    page,
		"limit":   limit,
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
		log.Printf("get entry error: %v", err)
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

	msg, err := h.svc.Respond(r.Context(), entryID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		log.Printf("respond error: %v", err)
		api.WriteError(w, api.ErrInternalServer.WithMessage("Failed to generate AI response"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
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

	userMsg, aiMsg, err := h.svc.AddMessage(r.Context(), entryID, userID, req.Content)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.WriteError(w, api.ErrNotFound)
			return
		}
		log.Printf("add message error: %v", err)
		api.WriteError(w, api.ErrInternalServer.WithMessage("Failed to generate AI response"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
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
		log.Printf("delete all entries error: %v", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
