package entry

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	mindai "github.com/alexa9795/mindflow/internal/ai"
)

// ErrNotFound is returned when the requested entry does not exist or does not
// belong to the requesting user.
var ErrNotFound = errors.New("not found")

// Service is the business-logic interface for journal entries.
type Service interface {
	Create(ctx context.Context, userID, content string, moodScore *int) (*Entry, error)
	List(ctx context.Context, userID string, page, limit int) ([]Entry, error)
	Get(ctx context.Context, id, userID string) (*Entry, error)
	Respond(ctx context.Context, entryID, userID string) (*Message, error)
	AddMessage(ctx context.Context, entryID, userID, content string) (*Message, *Message, error)
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

func (s *service) List(ctx context.Context, userID string, page, limit int) ([]Entry, error) {
	offset := (page - 1) * limit
	entries, err := s.repo.List(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list entries: %w", err)
	}
	return entries, nil
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

	userMsg, err := s.repo.SaveMessage(ctx, entryID, "user", content)
	if err != nil {
		return nil, nil, fmt.Errorf("save user message: %w", err)
	}

	messages, err := s.repo.LoadMessages(ctx, entryID)
	if err != nil {
		return nil, nil, fmt.Errorf("load messages: %w", err)
	}

	msgs := make([]mindai.Message, 0, 1+len(messages))
	msgs = append(msgs, mindai.Message{Role: "user", Content: "Here is my journal entry:\n\n" + entryContent})
	for _, m := range messages {
		msgs = append(msgs, mindai.Message{Role: m.Role, Content: m.Content})
	}

	aiText, err := s.ai.CallClaude(ctx, msgs, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("call claude: %w", err)
	}

	aiMsg, err := s.repo.SaveMessage(ctx, entryID, "assistant", aiText)
	if err != nil {
		return nil, nil, fmt.Errorf("save ai message: %w", err)
	}
	return userMsg, aiMsg, nil
}

func (s *service) DeleteAll(ctx context.Context, userID string) error {
	if err := s.repo.DeleteAllByUserID(ctx, userID); err != nil {
		return fmt.Errorf("delete all entries: %w", err)
	}
	return nil
}
