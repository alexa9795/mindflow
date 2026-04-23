package ai

import "log"

// LogTrigger emits a structured log line when a crisis/safety trigger phrase
// is detected in a user message. Only the matched trigger keyword is logged —
// never the journal content. Railway aggregates stdout logs automatically.
func LogTrigger(userID string, triggerWord string) {
	log.Printf("TRIGGER_EVENT user_id=%s trigger=%s", userID, triggerWord)
}
