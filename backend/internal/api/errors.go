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
	ErrBadRequest        = APIError{Code: "BAD_REQUEST", Message: "Bad request", HTTPStatus: http.StatusBadRequest}
	ErrUnauthorized      = APIError{Code: "UNAUTHORIZED", Message: "Unauthorized", HTTPStatus: http.StatusUnauthorized}
	ErrForbidden         = APIError{Code: "FORBIDDEN", Message: "Forbidden", HTTPStatus: http.StatusForbidden}
	ErrNotFound          = APIError{Code: "NOT_FOUND", Message: "Not found", HTTPStatus: http.StatusNotFound}
	ErrConflict          = APIError{Code: "CONFLICT", Message: "Conflict", HTTPStatus: http.StatusConflict}
	ErrInternalServer    = APIError{Code: "INTERNAL_SERVER_ERROR", Message: "Internal server error", HTTPStatus: http.StatusInternalServerError}
	ErrSubscriptionLimit = APIError{Code: "SUBSCRIPTION_LIMIT_REACHED", Message: "You've reached your 10 entry limit for this month. Upgrade to continue journaling.", HTTPStatus: http.StatusForbidden}
	ErrTrialNotAvailable = APIError{Code: "TRIAL_NOT_AVAILABLE", Message: "Trial is only available for free accounts.", HTTPStatus: http.StatusBadRequest}
	ErrRateLimited       = APIError{Code: "RATE_LIMITED", Message: "Too many requests. Please try again later.", HTTPStatus: http.StatusTooManyRequests}
	ErrAIRateLimited     = APIError{Code: "AI_RATE_LIMITED", Message: "Too many requests. Please wait before asking for another reflection.", HTTPStatus: http.StatusTooManyRequests}
	ErrAIDisabled        = APIError{Code: "AI_DISABLED", Message: "AI responses are disabled. Enable them in settings to get reflections.", HTTPStatus: http.StatusForbidden}
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
