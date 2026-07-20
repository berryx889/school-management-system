-- Free-text department for staff. No CHECK constraint: unlike subjects.type (a small
-- fixed set), department names genuinely vary per school and are admin-managed free text.
ALTER TABLE users ADD COLUMN department TEXT;
