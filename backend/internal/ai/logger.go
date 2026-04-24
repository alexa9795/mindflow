package ai

import "log/slog"

// LogTrigger emits a structured log line when a crisis/safety trigger phrase
// is detected in a user message. Only the matched trigger keyword is logged —
// never the journal content. Railway aggregates stdout logs automatically.
//
// GDPR note: logs metadata only (user_id + matched keyword).
// No journal content is ever logged. Aggregated by Railway.
// Legal basis: legitimate interest (user safety).
// Retention: governed by Railway log retention policy (configurable in dashboard).
func LogTrigger(userID string, triggerWord string) {
	slog.Info("trigger_event", "user_id", userID, "trigger", triggerWord)
}
