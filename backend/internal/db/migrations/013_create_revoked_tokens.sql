CREATE TABLE revoked_tokens (
    jti        UUID         PRIMARY KEY,
    revoked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);
