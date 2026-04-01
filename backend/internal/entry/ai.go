package entry

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	mindai "github.com/alexa9795/mindflow/internal/ai"
	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/middleware"
)

func Respond(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	entryID := r.PathValue("id")

	var entryContent string
	err := db.DB.QueryRow(`
		SELECT content FROM entries WHERE id = $1 AND user_id = $2`,
		entryID, userID,
	).Scan(&entryContent)
	if err == sql.ErrNoRows {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	existing, err := loadMessages(entryID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Build conversation: entry is always the first user message.
	msgs := make([]mindai.Message, 0, 1+len(existing))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range existing {
		msgs = append(msgs, mindai.Message{Role: m.Role, Content: m.Content})
	}

	aiText, err := mindai.CallClaude(msgs, userID)
	if err != nil {
		log.Printf("AI response error: %v", err)
		http.Error(w, "Failed to generate AI response", http.StatusInternalServerError)
		return
	}

	msg, err := saveMessage(entryID, "assistant", aiText)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

func AddMessage(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	entryID := r.PathValue("id")

	var entryContent string
	err := db.DB.QueryRow(`
		SELECT content FROM entries WHERE id = $1 AND user_id = $2`,
		entryID, userID,
	).Scan(&entryContent)
	if err == sql.ErrNoRows {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	// Save user message first.
	userMsg, err := saveMessage(entryID, "user", req.Content)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Load full conversation history for context.
	messages, err := loadMessages(entryID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	msgs := make([]mindai.Message, 0, 1+len(messages))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range messages {
		msgs = append(msgs, mindai.Message{Role: m.Role, Content: m.Content})
	}

	aiText, err := mindai.CallClaude(msgs, userID)
	if err != nil {
		log.Printf("AI response error: %v", err)
		http.Error(w, "Failed to generate AI response", http.StatusInternalServerError)
		return
	}

	aiMsg, err := saveMessage(entryID, "assistant", aiText)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_message":      userMsg,
		"assistant_message": aiMsg,
	})
}

func saveMessage(entryID, role, content string) (Message, error) {
	var m Message
	err := db.DB.QueryRow(`
		INSERT INTO messages (entry_id, role, content)
		VALUES ($1, $2, $3)
		RETURNING id, entry_id, role, content, created_at`,
		entryID, role, content,
	).Scan(&m.ID, &m.EntryID, &m.Role, &m.Content, &m.CreatedAt)
	return m, err
}
