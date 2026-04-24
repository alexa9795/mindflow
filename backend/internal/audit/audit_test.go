package audit

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
)

// mockExecer records calls to ExecContext and optionally returns an error.
type mockExecer struct {
	mu    sync.Mutex
	calls []execCall
	err   error
	wg    sync.WaitGroup
}

type execCall struct {
	query string
	args  []any
}

func (m *mockExecer) ExecContext(_ context.Context, query string, args ...any) (sql.Result, error) {
	defer m.wg.Done()
	m.mu.Lock()
	m.calls = append(m.calls, execCall{query: query, args: args})
	m.mu.Unlock()
	return nil, m.err
}

// newTestLogger creates a logger backed by the mock, using the internal constructor
// so tests can inject the mock dbExecer.
func newTestLogger(db dbExecer) *Logger {
	return newLogger(db)
}

func TestLogWithValidUserID(t *testing.T) {
	mock := &mockExecer{}
	l := newTestLogger(mock)
	defer l.Shutdown()
	mock.wg.Add(1)

	userID := "user-abc-123"
	l.Log(context.Background(), &userID, ActionLoginSuccess, "1.2.3.4", nil)
	mock.wg.Wait()

	mock.mu.Lock()
	defer mock.mu.Unlock()

	if len(mock.calls) != 1 {
		t.Fatalf("expected 1 exec call, got %d", len(mock.calls))
	}
	call := mock.calls[0]
	uid, ok := call.args[0].(*string)
	if !ok || uid == nil || *uid != userID {
		t.Errorf("expected userID %q, got %v", userID, call.args[0])
	}
	if call.args[1] != string(ActionLoginSuccess) {
		t.Errorf("expected action %q, got %v", ActionLoginSuccess, call.args[1])
	}
	if call.args[2] != "1.2.3.4" {
		t.Errorf("expected ip %q, got %v", "1.2.3.4", call.args[2])
	}
	if call.args[3] != nil {
		t.Errorf("expected nil metadata, got %v", call.args[3])
	}
}

func TestLogWithNilUserID(t *testing.T) {
	mock := &mockExecer{}
	l := newTestLogger(mock)
	defer l.Shutdown()
	mock.wg.Add(1)

	l.Log(context.Background(), nil, ActionInvalidToken, "2.2.2.2", nil)
	mock.wg.Wait()

	mock.mu.Lock()
	defer mock.mu.Unlock()

	if len(mock.calls) != 1 {
		t.Fatalf("expected 1 exec call, got %d", len(mock.calls))
	}
	uid, ok := mock.calls[0].args[0].(*string)
	if !ok || uid != nil {
		t.Errorf("expected nil *string for userID, got %v (type assertion ok=%v)", mock.calls[0].args[0], ok)
	}
}

func TestLogWithMetadata(t *testing.T) {
	mock := &mockExecer{}
	l := newTestLogger(mock)
	defer l.Shutdown()
	mock.wg.Add(1)

	userID := "user-xyz"
	l.Log(context.Background(), &userID, ActionUpdateAIToggle, "3.3.3.3",
		map[string]any{"ai_enabled": true})
	mock.wg.Wait()

	mock.mu.Lock()
	defer mock.mu.Unlock()

	if len(mock.calls) != 1 {
		t.Fatalf("expected 1 exec call, got %d", len(mock.calls))
	}
	meta, ok := mock.calls[0].args[3].(string)
	if !ok || meta == "" {
		t.Errorf("expected non-empty metadata JSON string, got %v", mock.calls[0].args[3])
	}
}

func TestLogDBFailureNoPanic(t *testing.T) {
	mock := &mockExecer{err: errors.New("connection refused")}
	l := newTestLogger(mock)
	defer l.Shutdown()
	mock.wg.Add(1)

	userID := "user-fail"
	// Must not panic on DB failure.
	l.Log(context.Background(), &userID, ActionLogout, "4.4.4.4", nil)
	mock.wg.Wait()
	// reaching here means no panic — the error was logged to slog
}

func TestLogNilLogger(t *testing.T) {
	var l *Logger
	// Must not panic when Logger is nil.
	l.Log(context.Background(), nil, ActionLoginSuccess, "", nil)
}

func TestShutdownDrainsQueue(t *testing.T) {
	mock := &mockExecer{}
	l := newTestLogger(mock)

	const n = 10
	mock.wg.Add(n)
	for i := 0; i < n; i++ {
		l.Log(context.Background(), nil, ActionLoginSuccess, "", nil)
	}
	l.Shutdown()

	mock.mu.Lock()
	defer mock.mu.Unlock()
	if len(mock.calls) != n {
		t.Errorf("expected %d calls after shutdown, got %d", n, len(mock.calls))
	}
}

func TestLogQueueFullDropsEvent(t *testing.T) {
	// Fill the queue so the next event is dropped.
	mock := &mockExecer{}
	l := &Logger{
		db:    mock,
		queue: make(chan auditEvent, 1),
	}
	// Don't start workers — queue stays full after 1 event.
	l.queue <- auditEvent{action: ActionLoginSuccess}

	// This send should be dropped (queue full), not block.
	l.Log(context.Background(), nil, ActionLoginFailure, "", nil)
	// If we reach here without blocking, the test passes.
}
