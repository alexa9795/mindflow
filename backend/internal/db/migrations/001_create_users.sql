CREATE TABLE IF NOT EXISTS users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              VARCHAR(255) NOT NULL UNIQUE,
    name               VARCHAR(255) NOT NULL,
    password_hash      VARCHAR(255),
    subscription_tier  VARCHAR(20) DEFAULT 'free',
    trial_ends_at      TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT users_subscription_tier_check CHECK (subscription_tier IN ('free', 'premium'))
);
