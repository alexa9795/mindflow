-- GDPR Art. 9(2)(a): explicit consent to STORE special-category journal
-- content (mental-health/wellbeing text + mood scores). This is distinct from
-- ai_consent_given_at (Art. 9 consent to PROCESS that content with the AI).
--
-- Captured at registration: the user cannot journal without storing content,
-- so consent is required to create an account (enforced in the API handler).
ALTER TABLE users ADD COLUMN journaling_consent_given_at TIMESTAMPTZ;

-- Backfill pre-existing accounts to their creation time. This is a pragmatic
-- migration for accounts created before explicit storage consent existed; for
-- a real production base you would instead re-prompt on next app open. Safe
-- here because this runs pre-launch (no production users yet).
UPDATE users SET journaling_consent_given_at = created_at
WHERE journaling_consent_given_at IS NULL;
