-- JTI column was UUID but tokens issued before migration 013 may have non-UUID JTIs.
-- TEXT is a safe superset: UUIDs and arbitrary hex strings both store correctly.
ALTER TABLE revoked_tokens ALTER COLUMN jti TYPE TEXT;
