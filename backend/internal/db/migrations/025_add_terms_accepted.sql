-- Contract evidence (GDPR Art. 6(1)(b)): records that the user accepted the
-- Terms of Service when creating their account. Kept SEPARATE from
-- journaling_consent_given_at — Art. 9 consent must not be bundled with
-- general contract acceptance ("freely given, specific").
--
-- Captured at registration and enforced in the API handler.
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;

-- Backfill pre-existing accounts to their creation time. Pragmatic pre-launch
-- migration (no production users yet); for a real base you would re-prompt.
UPDATE users SET terms_accepted_at = created_at
WHERE terms_accepted_at IS NULL;
