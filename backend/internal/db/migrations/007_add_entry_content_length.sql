ALTER TABLE entries ADD CONSTRAINT entries_content_length
    CHECK (char_length(content) <= 10000);
