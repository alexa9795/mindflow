CREATE TABLE user_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    most_active_day VARCHAR(10),
    least_active_day VARCHAR(10),
    avg_mood_by_day JSONB,
    peak_writing_hour INTEGER,
    longest_entry_day VARCHAR(10),
    entries_per_weekday JSONB,
    mood_trend VARCHAR(20),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_patterns_user_id ON user_patterns(user_id);
