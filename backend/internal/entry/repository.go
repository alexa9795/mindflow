package entry

import (
	"context"
	"database/sql"
	"fmt"
)

// Repository is the data-access interface for journal entries and messages.
type Repository interface {
	Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Entry, int, error)
	GetByID(ctx context.Context, id, userID string) (*Entry, error)
	GetContent(ctx context.Context, id, userID string) (string, error)
	GetAssistantMessage(ctx context.Context, entryID string) (*Message, error)
	SaveMessage(ctx context.Context, entryID, role, content string) (*Message, error)
	SaveMessagesInTx(ctx context.Context, entryID, userContent, aiContent string) (*Message, *Message, error)
	LoadMessages(ctx context.Context, entryID string) ([]Message, error)
	ExportUserData(ctx context.Context, userID string) ([]Entry, error)
	DeleteAllByUserID(ctx context.Context, userID string) error
}

type repository struct {
	db *sql.DB
}

// NewRepository returns a Postgres-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error) {
	var e Entry
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO entries (user_id, content, mood_score)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, content, mood_score, created_at`,
		userID, content, moodScore,
	).Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create entry: %w", err)
	}
	return &e, nil
}

func (r *repository) List(ctx context.Context, userID string, limit, offset int) ([]Entry, int, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, LEFT(content, 120) AS content, mood_score, created_at, COUNT(*) OVER() AS total
		FROM entries
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list entries: %w", err)
	}
	defer rows.Close()

	var total int
	entries := []Entry{}
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt, &total); err != nil {
			return nil, 0, fmt.Errorf("scan entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *repository) GetByID(ctx context.Context, id, userID string) (*Entry, error) {
	var e Entry
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, content, mood_score, created_at
		FROM entries
		WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get entry: %w", err)
	}
	return &e, nil
}

func (r *repository) GetContent(ctx context.Context, id, userID string) (string, error) {
	var content string
	err := r.db.QueryRowContext(ctx, `
		SELECT content FROM entries WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&content)
	if err != nil {
		return "", fmt.Errorf("get entry content: %w", err)
	}
	return content, nil
}

func (r *repository) GetAssistantMessage(ctx context.Context, entryID string) (*Message, error) {
	var m Message
	err := r.db.QueryRowContext(ctx, `
		SELECT id, entry_id, role, content, created_at
		FROM messages
		WHERE entry_id = $1 AND role = 'assistant'
		ORDER BY created_at ASC
		LIMIT 1`,
		entryID,
	).Scan(&m.ID, &m.EntryID, &m.Role, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *repository) SaveMessage(ctx context.Context, entryID, role, content string) (*Message, error) {
	var m Message
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO messages (entry_id, role, content)
		VALUES ($1, $2, $3)
		RETURNING id, entry_id, role, content, created_at`,
		entryID, role, content,
	).Scan(&m.ID, &m.EntryID, &m.Role, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("save message: %w", err)
	}
	return &m, nil
}

// SaveMessagesInTx persists the user message and AI response atomically.
// Claude must be called before this — if this fails, nothing is saved.
func (r *repository) SaveMessagesInTx(ctx context.Context, entryID, userContent, aiContent string) (*Message, *Message, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	var userMsg Message
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO messages (entry_id, role, content)
		VALUES ($1, 'user', $2)
		RETURNING id, entry_id, role, content, created_at`,
		entryID, userContent,
	).Scan(&userMsg.ID, &userMsg.EntryID, &userMsg.Role, &userMsg.Content, &userMsg.CreatedAt); err != nil {
		return nil, nil, fmt.Errorf("save user message: %w", err)
	}

	var aiMsg Message
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO messages (entry_id, role, content)
		VALUES ($1, 'assistant', $2)
		RETURNING id, entry_id, role, content, created_at`,
		entryID, aiContent,
	).Scan(&aiMsg.ID, &aiMsg.EntryID, &aiMsg.Role, &aiMsg.Content, &aiMsg.CreatedAt); err != nil {
		return nil, nil, fmt.Errorf("save ai message: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("commit messages: %w", err)
	}
	return &userMsg, &aiMsg, nil
}

func (r *repository) DeleteAllByUserID(ctx context.Context, userID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Messages must be deleted before entries to satisfy the FK constraint.
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM messages
		WHERE entry_id IN (SELECT id FROM entries WHERE user_id = $1)`,
		userID,
	); err != nil {
		return fmt.Errorf("delete messages for user: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM entries WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete all entries: %w", err)
	}

	return tx.Commit()
}

func (r *repository) LoadMessages(ctx context.Context, entryID string) ([]Message, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, entry_id, role, content, created_at
		FROM messages
		WHERE entry_id = $1
		ORDER BY created_at ASC`,
		entryID,
	)
	if err != nil {
		return nil, fmt.Errorf("load messages: %w", err)
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.EntryID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// ExportUserData returns all entries with their full content and messages for GDPR Article 20.
func (r *repository) ExportUserData(ctx context.Context, userID string) ([]Entry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, content, mood_score, created_at
		FROM entries
		WHERE user_id = $1
		ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("export entries: %w", err)
	}
	defer rows.Close()

	entries := []Entry{}
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Content, &e.MoodScore, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan entry: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range entries {
		msgs, err := r.LoadMessages(ctx, entries[i].ID)
		if err != nil {
			return nil, fmt.Errorf("load messages for export: %w", err)
		}
		entries[i].Messages = msgs
	}
	return entries, nil
}
