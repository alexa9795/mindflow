package revenuecat

// webhookPayload is the top-level RevenueCat webhook body.
// RevenueCat wraps the event in an "event" object.
// See https://www.revenuecat.com/docs/webhooks
type webhookPayload struct {
	Event event `json:"event"`
}

// event holds the fields we need from a RevenueCat webhook event.
type event struct {
	Type           string `json:"type"`
	AppUserID      string `json:"app_user_id"`
	ProductID      string `json:"product_id"`
	ExpirationAtMs int64  `json:"expiration_at_ms"`
}
