-- Stage/level/section hierarchy for bulk-generating classes. All new `classes` columns are
-- nullable so every existing row and every existing code path (which only ever reads
-- id/name/level/class_teacher_id) keeps working untouched.
CREATE TABLE academic_stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE classes ADD COLUMN stage_id INT REFERENCES academic_stages(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN level_number INT;
ALTER TABLE classes ADD COLUMN section TEXT;
ALTER TABLE classes ADD COLUMN capacity INT;
