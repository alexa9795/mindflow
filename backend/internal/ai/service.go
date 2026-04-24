package ai

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"os"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

//go:embed system_prompt.txt
var systemPrompt string

// Service is the interface for AI operations.
type Service interface {
	CallClaude(ctx context.Context, messages []Message, userID string) (string, error)
}

type service struct {
	client anthropic.Client
}

// NewService returns an AI service backed by the Anthropic API.
func NewService() Service {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		slog.Error("ANTHROPIC_API_KEY not set — cannot start AI service")
		os.Exit(1)
	}
	return &service{
		client: anthropic.NewClient(option.WithAPIKey(apiKey)),
	}
}

func (s *service) CallClaude(ctx context.Context, messages []Message, userID string) (string, error) {
	for _, m := range messages {
		if m.Role == "user" {
			if word := findTrigger(m.Content); word != "" {
				LogTrigger(userID, word)
			}
		}
	}

	apiMessages := make([]anthropic.MessageParam, 0, len(messages))
	for _, m := range messages {
		block := anthropic.NewTextBlock(m.Content)
		if m.Role == "assistant" {
			apiMessages = append(apiMessages, anthropic.NewAssistantMessage(block))
		} else {
			apiMessages = append(apiMessages, anthropic.NewUserMessage(block))
		}
	}

	resp, err := s.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_6,
		MaxTokens: 600,
		// TextBlockParam{Type: "text"} is the SDK-idiomatic way to pass
		// the system prompt as of v1.35.0 — no constructor available.
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
