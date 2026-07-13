ALTER TABLE users ADD COLUMN locale VARCHAR(5) NOT NULL DEFAULT 'en'
	CHECK (locale IN ('en', 'fr', 'es', 'de', 'it', 'pt'));
