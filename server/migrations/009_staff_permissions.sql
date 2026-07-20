-- Additive staff-permission grants. A grant supplements (never replaces) the inherent
-- rights of class_subjects.teacher_id (marks) and classes.class_teacher_id (remarks).
CREATE TABLE staff_permissions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('marks_entry','remarks_entry')),
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  granted_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Two partial unique indexes rather than one UNIQUE(...) tuple: subject_id is NULL for
-- remarks_entry grants, and Postgres treats NULLs as distinct in a plain UNIQUE
-- constraint, which would let duplicate remarks_entry grants slip in.
CREATE UNIQUE INDEX staff_permissions_marks_unique
  ON staff_permissions (user_id, class_id, subject_id) WHERE permission_type = 'marks_entry';
CREATE UNIQUE INDEX staff_permissions_remarks_unique
  ON staff_permissions (user_id, class_id) WHERE permission_type = 'remarks_entry';
