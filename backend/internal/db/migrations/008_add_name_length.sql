ALTER TABLE users ADD CONSTRAINT users_name_length
    CHECK (char_length(name) <= 50);
