package revenuecat

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	api "github.com/alexa9795/mindflow/internal/api"
)

// Handler holds the HTTP handler for RevenueCat webhooks.
type Handler struct {
	repo Repository
}

// NewHandler returns a Handler backed by the given Repository.
func NewHandler(repo Repository) *Handler {
	return &Handler{repo: repo}
}

// RevenueCat event types we act on.
const (
	eventInitialPurchase = "INITIAL_PURCHASE"
	eventRenewal         = "RENEWAL"
	eventUncancellation  = "UNCANCELLATION"
	eventCancellation    = "CANCELLATION"
	eventExpiration      = "EXPIRATION"
	eventBillingIssue    = "BILLING_ISSUE"
)

// Webhook handles POST /api/webhooks/revenuecat.
// It validates the shared secret, parses the event, and updates the user's
// subscription. It returns 200 for any recognised event (so RevenueCat does
// not retry), 400 for a malformed body, and 401 for a bad secret.
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("REVENUECAT_WEBHOOK_SECRET")
	if secret == "" {
		slog.Error("revenuecat webhook: REVENUECAT_WEBHOOK_SECRET not set")
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	provided := r.Header.Get("Authorization")
	if subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
		api.WriteError(w, api.ErrUnauthorized)
		return
	}

	var payload webhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Invalid webhook body"))
		return
	}

	ev := payload.Event
	if ev.Type == "" || ev.AppUserID == "" {
		api.WriteError(w, api.ErrBadRequest.WithMessage("Missing event type or app_user_id"))
		return
	}

	if err := h.apply(r, ev); err != nil {
		if errors.Is(err, errUnhandledEvent) {
			// Unknown event type — acknowledge so RevenueCat stops retrying.
			w.WriteHeader(http.StatusOK)
			return
		}
		slog.Error("revenuecat webhook: failed to apply event",
			"type", ev.Type, "app_user_id", ev.AppUserID, "error", err)
		api.WriteError(w, api.ErrInternalServer)
		return
	}

	w.WriteHeader(http.StatusOK)
}

var errUnhandledEvent = errors.New("unhandled event type")

func (h *Handler) apply(r *http.Request, ev event) error {
	switch ev.Type {
	case eventInitialPurchase, eventRenewal, eventUncancellation:
		tier := tierFromProduct(ev.ProductID)
		var expiresAt *time.Time
		if ev.ExpirationAtMs > 0 {
			t := time.UnixMilli(ev.ExpirationAtMs).UTC()
			expiresAt = &t
		}
		return h.repo.UpdateSubscription(r.Context(), ev.AppUserID, tier, expiresAt)
	case eventCancellation, eventExpiration, eventBillingIssue:
		return h.repo.UpdateSubscription(r.Context(), ev.AppUserID, "free", nil)
	default:
		return errUnhandledEvent
	}
}

// tierFromProduct maps a RevenueCat product identifier to a subscription tier.
// Anything containing "yearly" is yearly; otherwise it defaults to monthly.
func tierFromProduct(productID string) string {
	if strings.Contains(strings.ToLower(productID), "yearly") {
		return "yearly"
	}
	return "monthly"
}
