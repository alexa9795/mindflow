package api

import (
	"encoding/json"
	"net/http"
)

// APIError is a structured error returned by all API handlers.
type APIError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	HTTPStatus int    `json:"-"`
}

// WithMessage returns a copy of the error with a different message.
func (e APIError) WithMessage(msg string) APIError {
	return APIError{Code: e.Code, Message: msg, HTTPStatus: e.HTTPStatus}
}

// Pre-defined errors covering the common HTTP error cases.
var (
	ErrBadRequest     = APIError{Code: "BAD_REQUEST", Message: "Bad request", HTTPStatus: http.StatusBadRequest}
	ErrUnauthorized   = APIError{Code: "UNAUTHORIZED", Message: "Unauthorized", HTTPStatus: http.StatusUnauthorized}
	ErrForbidden      = APIError{Code: "FORBIDDEN", Message: "Forbidden", HTTPStatus: http.StatusForbidden}
	ErrNotFound       = APIError{Code: "NOT_FOUND", Message: "Not found", HTTPStatus: http.StatusNotFound}
	ErrConflict       = APIError{Code: "CONFLICT", Message: "Conflict", HTTPStatus: http.StatusConflict}
	ErrInternalServer = APIError{Code: "INTERNAL_SERVER_ERROR", Message: "Internal server error", HTTPStatus: http.StatusInternalServerError}
)

// WriteError writes a JSON error response in the canonical shape:
//
//	{"error": {"code": "...", "message": "..."}}
func WriteError(w http.ResponseWriter, err APIError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.HTTPStatus)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]string{
			"code":    err.Code,
			"message": err.Message,
		},
	})
}
