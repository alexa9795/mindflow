-- Soft delete for journal entries: deleting an entry moves it to a "trash"
-- (deleted_at set) instead of removing the row, so it can be restored.
ALTER TABLE entries ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_entries_user_deleted
    ON entries(user_id, deleted_at);
