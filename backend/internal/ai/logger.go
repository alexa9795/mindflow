package ai

import "log/slog"

// LogTrigger emits a structured log line when a crisis/safety trigger phrase
// is detected in a user message. Only the matched trigger keyword is logged —
// never the journal content. Railway aggregates stdout logs automatically.
//
// GDPR note: logs metadata only (user_id + matched keyword).
// No journal content is ever logged. Aggregated by Railway.
// Legal basis: the underlying content is processed under the user's explicit
// consent to AI processing (Art. 9(2)(a)); this safety-metadata log serves the
// user's vital interests (Art. 9(2)(c)) where applicable. Matches Privacy
// Policy §3.4. No Art. 22 automated decision results from a match.
// Retention: governed by Railway log retention policy (configurable in dashboard).
func LogTrigger(userID string, triggerWord string) {
	slog.Info("trigger_event", "user_id", userID, "trigger", triggerWord)
}
