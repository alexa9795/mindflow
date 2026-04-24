package insights

import (
	"encoding/json"
	"log/slog"
	"net/http"

	api "github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/middleware"
)

// Handler holds the HTTP handlers for insights endpoints.
type Handler struct {
	svc Service
}

// NewHandler returns a Handler backed by the given Service.
func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetInsights(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	insights, err := h.svc.GetInsights(r.Context(), userID)
	if err != nil {
		slog.Error("get insights error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(insights)
}
