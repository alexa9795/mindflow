CREATE TABLE IF NOT EXISTS entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    mood_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT entries_mood_score_check CHECK (mood_score >= 1 AND mood_score <= 5)
);
