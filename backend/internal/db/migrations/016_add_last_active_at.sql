ALTER TABLE users ADD COLUMN last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX idx_users_last_active ON users(last_active_at);
