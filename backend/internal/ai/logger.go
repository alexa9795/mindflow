package ai

import (
	"fmt"
	"os"
	"time"
)

// LogTrigger appends a trigger event to logs/triggers.log.
// Only the matched trigger word is logged — never the journal content.
func LogTrigger(userID string, triggerWord string) {
	line := fmt.Sprintf("%s | user_id=%s | trigger=%s\n",
		time.Now().UTC().Format(time.RFC3339),
		userID,
		triggerWord,
	)

	if err := os.MkdirAll("logs", 0755); err != nil {
		return
	}

	f, err := os.OpenFile("logs/triggers.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()

	f.WriteString(line) //nolint:errcheck
}
