package entry

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	mindai "github.com/alexa9795/mindflow/internal/ai"
)

// ErrNotFound is returned when the requested entry does not exist or does not
// belong to the requesting user.
var ErrNotFound = errors.New("not found")

// Service is the business-logic interface for journal entries.
type Service interface {
	Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error)
	List(ctx context.Context, userID string, page, limit int) ([]Entry, int, error)
	Get(ctx context.Context, id, userID string) (*Entry, error)
	Respond(ctx context.Context, entryID, userID string) (*Message, error)
	AddMessage(ctx context.Context, entryID, userID, content string) (*Message, *Message, error)
	GetExport(ctx context.Context, userID string) (*ExportData, error)
	DeleteAll(ctx context.Context, userID string) error
}

type service struct {
	repo Repository
	ai   mindai.Service
}

// NewService returns an entry Service backed by the given Repository and AI service.
func NewService(repo Repository, ai mindai.Service) Service {
	return &service{repo: repo, ai: ai}
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

func (s *service) Respond(ctx context.Context, entryID, userID string) (*Message, error) {
	entryContent, err := s.repo.GetContent(ctx, entryID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get entry content: %w", err)
	}

	// Idempotency: return the existing AI response without re-calling Claude.
	if existing, err := s.repo.GetAssistantMessage(ctx, entryID); err == nil {
		return existing, nil
	}

	existing, err := s.repo.LoadMessages(ctx, entryID)
	if err != nil {
		return nil, fmt.Errorf("load messages: %w", err)
	}

	msgs := make([]mindai.Message, 0, 1+len(existing))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range existing {
		msgs = append(msgs, mindai.Message{Role: m.Role, Content: m.Content})
	}

	aiText, err := s.ai.CallClaude(ctx, msgs, userID)
	if err != nil {
		return nil, fmt.Errorf("call claude: %w", err)
	}

	msg, err := s.repo.SaveMessage(ctx, entryID, "assistant", aiText)
	if err != nil {
		return nil, fmt.Errorf("save message: %w", err)
	}
	return msg, nil
}

func (s *service) AddMessage(ctx context.Context, entryID, userID, content string) (*Message, *Message, error) {
	entryContent, err := s.repo.GetContent(ctx, entryID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, fmt.Errorf("get entry content: %w", err)
	}

	// Load existing messages to build conversation context for Claude.
	existing, err := s.repo.LoadMessages(ctx, entryID)
	if err != nil {
		return nil, nil, fmt.Errorf("load messages: %w", err)
	}

	// Build the full message history: original entry + conversation + new message.
	// The new user message is appended in-memory only — no DB write until Claude succeeds.
	msgs := make([]mindai.Message, 0, 2+len(existing))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range existing {
		msgs = append(msgs, mindai.Message{Role: m.Role, Content: m.Content})
	}
	msgs = append(msgs, mindai.Message{Role: "user", Content: content})

	// Call Claude before any DB writes — if this fails, nothing is persisted.
	aiText, err := s.ai.CallClaude(ctx, msgs, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("call claude: %w", err)
	}

	// Persist both messages atomically — either both are saved or neither is.
	userMsg, aiMsg, err := s.repo.SaveMessagesInTx(ctx, entryID, content, aiText)
	if err != nil {
		return nil, nil, fmt.Errorf("save messages: %w", err)
	}
	return userMsg, aiMsg, nil
}

func (s *service) GetExport(ctx context.Context, userID string) (*ExportData, error) {
	user, err := s.repo.GetUserForExport(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user for export: %w", err)
	}
	entries, err := s.repo.ExportUserData(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("export user data: %w", err)
	}
	return &ExportData{
		ExportedAt: time.Now().UTC(),
		User:       *user,
		Entries:    entries,
	}, nil
}

func (s *service) DeleteAll(ctx context.Context, userID string) error {
	if err := s.repo.DeleteAllByUserID(ctx, userID); err != nil {
		return fmt.Errorf("delete all entries: %w", err)
	}
	return nil
}
