-- Attendance remarks (e.g. "sick", "left early") alongside the status.
ALTER TABLE attendance ADD COLUMN remark TEXT;

-- Core vs elective classification for subjects.
ALTER TABLE subjects ADD COLUMN type TEXT NOT NULL DEFAULT 'core' CHECK (type IN ('core', 'elective'));
