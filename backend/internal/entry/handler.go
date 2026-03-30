package entry

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/alexa9795/mindflow/internal/db"
	"github.com/alexa9795/mindflow/internal/middleware"
)

type createRequest struct {
	Content   string `json:"content"`
	MoodScore *int   `json:"mood_score"`
}

func Create(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	var e Entry
	err := db.DB.QueryRow(`
		INSERT INTO entries (user_id, content, mood_score)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, content, mood_score, created_at`,
		userID, req.Content, req.MoodScore,
	).Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(e)
}

func List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	page, limit := 1, 20
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	offset := (page - 1) * limit

	rows, err := db.DB.Query(`
		SELECT id, user_id, content, mood_score, created_at
		FROM entries
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	entries := []Entry{}
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt); err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"entries": entries,
		"page":    page,
		"limit":   limit,
	})
}

func Get(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	entryID := r.PathValue("id")

	var e Entry
	err := db.DB.QueryRow(`
		SELECT id, user_id, content, mood_score, created_at
		FROM entries
		WHERE id = $1 AND user_id = $2`,
		entryID, userID,
	).Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt)
	if err == sql.ErrNoRows {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	messages, err := loadMessages(entryID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	e.Messages = messages

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

func loadMessages(entryID string) ([]Message, error) {
	rows, err := db.DB.Query(`
		SELECT id, entry_id, role, content, created_at
		FROM messages
		WHERE entry_id = $1
		ORDER BY created_at ASC`,
		entryID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.EntryID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}
