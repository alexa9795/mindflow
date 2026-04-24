package entry

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	mindai "github.com/alexa9795/mindflow/internal/ai"
)

// ErrNotFound is returned when the requested entry does not exist or does not
// belong to the requesting user.
var ErrNotFound = errors.New("not found")

// ErrAIDisabled is returned when the user has disabled AI responses.
var ErrAIDisabled = errors.New("ai disabled")

// ErrAIUnavailable is returned when the Claude API fails transiently.
// Handlers should respond gracefully rather than returning 500.
var ErrAIUnavailable = errors.New("ai temporarily unavailable")

// UserFlags provides user-level feature flags to the entry service.
// Implemented by auth.Service so main.go can wire it without circular imports.
type UserFlags interface {
	GetAIEnabled(ctx context.Context, userID string) (bool, error)
}

// Service is the business-logic interface for journal entries.
type Service interface {
	Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error)
	List(ctx context.Context, userID string, page, limit int) ([]Entry, int, error)
	Get(ctx context.Context, id, userID string) (*Entry, error)
	// Respond returns the AI reply for an entry's initial response.
	// isNew is true when a new message was created, false when the cached response was returned.
	// On transient Claude failure: returns (nil, false, ErrAIUnavailable).
	// When AI is disabled by the user: returns (nil, false, ErrAIDisabled).
	Respond(ctx context.Context, entryID, userID string) (*Message, bool, error)
	// AddMessage appends a user reply and AI response to an entry's conversation.
	// aiError is true when Claude failed transiently; in that case neither message is saved.
	// When AI is disabled by the user: returns (nil, nil, false, ErrAIDisabled).
	AddMessage(ctx context.Context, entryID, userID, content string) (*Message, *Message, bool, error)
	DeleteAll(ctx context.Context, userID string) error
}

type service struct {
	repo      Repository
	ai        mindai.Service
	userFlags UserFlags
}

// NewService returns an entry Service backed by the given Repository, AI service, and UserFlags.
func NewService(repo Repository, ai mindai.Service, userFlags UserFlags) Service {
	return &service{repo: repo, ai: ai, userFlags: userFlags}
}

func (s *service) Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error) {
	e, err := s.repo.Create(ctx, userID, content, moodScore)
	if err != nil {
		return nil, fmt.Errorf("create entry: %w", err)
	}
	return e, nil
}

func (s *service) List(ctx context.Context, userID string, page, limit int) ([]Entry, int, error) {
	offset := (page - 1) * limit
	entries, total, err := s.repo.List(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list entries: %w", err)
	}
	return entries, total, nil
}

func (s *service) Get(ctx context.Context, id, userID string) (*Entry, error) {
	e, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get entry: %w", err)
	}

	messages, err := s.repo.LoadMessages(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("load messages: %w", err)
	}
	e.Messages = messages
	return e, nil
}

func (s *service) Respond(ctx context.Context, entryID, userID string) (*Message, bool, error) {
	entryContent, err := s.repo.GetContent(ctx, entryID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, false, ErrNotFound
		}
		return nil, false, fmt.Errorf("get entry content: %w", err)
	}

	// Idempotency: return the existing AI response without re-calling Claude.
	if existing, err := s.repo.GetAssistantMessage(ctx, entryID); err == nil {
		return existing, false, nil
	}

	enabled, err := s.userFlags.GetAIEnabled(ctx, userID)
	if err != nil {
		return nil, false, fmt.Errorf("check ai enabled: %w", err)
	}
	if !enabled {
		return nil, false, ErrAIDisabled
	}

	existing, err := s.repo.LoadMessages(ctx, entryID)
	if err != nil {
		return nil, false, fmt.Errorf("load messages: %w", err)
	}

	msgs := make([]mindai.Message, 0, 1+len(existing))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range existing {
		msgs = append(msgs, mindai.Message{Role: string(m.Role), Content: m.Content})
	}

	aiText, err := s.ai.CallClaude(ctx, msgs, userID)
	if err != nil {
		slog.Error("claude api error in respond", "entry_id", entryID, "error", err)
		return nil, false, ErrAIUnavailable
	}

	msg, err := s.repo.SaveMessage(ctx, entryID, RoleAssistant, aiText)
	if err != nil {
		return nil, false, fmt.Errorf("save message: %w", err)
	}
	return msg, true, nil
}

func (s *service) AddMessage(ctx context.Context, entryID, userID, content string) (*Message, *Message, bool, error) {
	entryContent, err := s.repo.GetContent(ctx, entryID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, false, ErrNotFound
		}
		return nil, nil, false, fmt.Errorf("get entry content: %w", err)
	}

	enabled, err := s.userFlags.GetAIEnabled(ctx, userID)
	if err != nil {
		return nil, nil, false, fmt.Errorf("check ai enabled: %w", err)
	}
	if !enabled {
		return nil, nil, false, ErrAIDisabled
	}

	existing, err := s.repo.LoadMessages(ctx, entryID)
	if err != nil {
		return nil, nil, false, fmt.Errorf("load messages: %w", err)
	}

	msgs := make([]mindai.Message, 0, 2+len(existing))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range existing {
		msgs = append(msgs, mindai.Message{Role: string(m.Role), Content: m.Content})
	}
	msgs = append(msgs, mindai.Message{Role: "user", Content: content})

	// Call Claude BEFORE saving any messages — if Claude fails, nothing is persisted.
	aiText, err := s.ai.CallClaude(ctx, msgs, userID)
	if err != nil {
		slog.Error("claude api error in add_message", "entry_id", entryID, "error", err)
		return nil, nil, true, nil
	}

	// Both messages saved atomically — if this fails, neither is persisted.
	userMsg, aiMsg, err := s.repo.SaveMessagesInTx(ctx, entryID, content, aiText)
	if err != nil {
		return nil, nil, false, fmt.Errorf("save messages: %w", err)
	}
	return userMsg, aiMsg, false, nil
}

func (s *service) DeleteAll(ctx context.Context, userID string) error {
	if err := s.repo.DeleteAllByUserID(ctx, userID); err != nil {
		return fmt.Errorf("delete all entries: %w", err)
	}
	return nil
}
