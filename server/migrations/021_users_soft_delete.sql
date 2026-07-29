-- Soft-delete for users (teachers/staff). Previously "Delete" on a teacher or staff member
-- hard-removed the row, which was irreversible and caused accidental permanent data loss.
-- With deleted_at, delete becomes a reversible move to Trash, matching classes/subjects/students.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
