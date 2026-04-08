ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type      VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester               BOOLEAN     NOT NULL DEFAULT false;

ALTER TABLE users ADD CONSTRAINT users_subscription_type_check
    CHECK (subscription_type IN ('free', 'trial', 'monthly', 'yearly', 'tester'));
