CREATE TABLE IF NOT EXISTS messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    role       VARCHAR(10),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant'))
);
