CREATE TABLE IF NOT EXISTS insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    summary         TEXT,
    word_cloud_json JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
