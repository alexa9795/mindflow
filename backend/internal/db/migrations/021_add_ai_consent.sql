-- ai_enabled defaults to true for new users.
-- Consent is captured via ai_consent_given_at on first AI interaction.
-- Pre-migration users require consent on next app open (see mobile).
ALTER TABLE users ADD COLUMN ai_consent_given_at TIMESTAMPTZ;
