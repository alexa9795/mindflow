CREATE INDEX IF NOT EXISTS idx_entries_user_id
    ON entries(user_id);

CREATE INDEX IF NOT EXISTS idx_entries_user_created
    ON entries(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_entry_id
    ON messages(entry_id);
