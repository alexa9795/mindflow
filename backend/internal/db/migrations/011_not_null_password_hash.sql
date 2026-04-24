DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE password_hash IS NULL
    ) THEN
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
    ELSE
        RAISE NOTICE 'Skipping NOT NULL: NULL password_hash rows exist';
    END IF;
END $$;
