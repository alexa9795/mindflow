package export

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/alexa9795/mindflow/internal/api"
	"github.com/alexa9795/mindflow/internal/audit"
	"github.com/alexa9795/mindflow/internal/middleware"
)

// Handler holds the HTTP handler for the GDPR export endpoint.
type Handler struct {
	svc   Service
	audit *audit.Logger
}

// NewHandler returns a Handler backed by the given Service and audit Logger.
func NewHandler(svc Service, auditLogger *audit.Logger) *Handler {
	return &Handler{svc: svc, audit: auditLogger}
}

// Export handles GET /api/export.
func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	data, err := h.svc.GetExport(r.Context(), userID)
	if err != nil {
		slog.Error("export error", "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	h.audit.Log(r.Context(), &userID, audit.ActionDataExport, audit.IPFromRequest(r), nil)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="echo-export.json"`)
	_ = json.NewEncoder(w).Encode(data)
}
