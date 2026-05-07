-- GDPR Art. 9 compliance: retroactively withdraw AI processing for users
-- who never gave explicit consent, and change the column default so new
-- accounts start with AI off until the user actively opts in.

UPDATE users SET ai_enabled = false WHERE ai_consent_given_at IS NULL;

ALTER TABLE users ALTER COLUMN ai_enabled SET DEFAULT false;
