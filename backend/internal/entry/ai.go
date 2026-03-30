package entry

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/middleware"
	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const systemPrompt = `You are a compassionate AI journaling companion. Your role is to help users reflect on their thoughts and feelings through empathetic, thoughtful responses.

When responding to a journal entry or message, always provide:
1. An empathetic reflection that validates the user's feelings and shows you understood what they shared
2. One thoughtful follow-up question to help them explore their thoughts deeper
3. One gentle nudge or actionable suggestion relevant to what they shared

Keep your response warm, non-judgmental, and concise (2-4 paragraphs). Never give clinical advice or diagnoses.`

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

	// Respond to the journal entry directly, without conversation history
	aiText, err := callClaude(r.Context(), entryContent, nil)
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

	// Save user message first
	userMsg, err := saveMessage(entryID, "user", req.Content)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Load full conversation history for context
	messages, err := loadMessages(entryID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	aiText, err := callClaude(r.Context(), entryContent, messages)
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

// callClaude sends the journal entry + conversation history to Claude and returns the response text.
// messages should be nil for the initial /respond call, or the full message history for /messages.
func callClaude(ctx context.Context, entryContent string, messages []Message) (string, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY not set")
	}

	client := anthropic.NewClient(option.WithAPIKey(apiKey))

	// Build conversation: entry is always the first user message
	apiMessages := []anthropic.MessageParam{
		anthropic.NewUserMessage(anthropic.NewTextBlock(
			fmt.Sprintf("Here is my journal entry:\n\n%s", entryContent),
		)),
	}

	// Append conversation history after the entry
	for _, m := range messages {
		block := anthropic.NewTextBlock(m.Content)
		if m.Role == "assistant" {
			apiMessages = append(apiMessages, anthropic.NewAssistantMessage(block))
		} else {
			apiMessages = append(apiMessages, anthropic.NewUserMessage(block))
		}
	}

	resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_6,
		MaxTokens: 1024,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt, Type: "text"},
		},
		Messages: apiMessages,
	})
	if err != nil {
		return "", fmt.Errorf("anthropic API error: %w", err)
	}

	if len(resp.Content) == 0 {
		return "", fmt.Errorf("empty response from AI")
	}

	return resp.Content[0].Text, nil
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
