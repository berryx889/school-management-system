-- ── Multi-tenancy, Phase 1: schema only (no enforcement yet) ──
--
-- Introduces the tenant table (schools) and stamps school_id onto every tenant-scoped
-- table. Deliberately NON-BREAKING: school_id is NOT NULL DEFAULT 1, so all existing rows
-- backfill to the founding school and every current INSERT/SELECT keeps working untouched.
-- Row-level-security enforcement and the switch of the default to the per-request session
-- variable come in Phase 2 (migration 015) once the app routes queries through a
-- tenant-scoped client. Until then this is pure additive schema.
--
-- Denormalization note: school_id is added to EVERY tenant table (even ones where it's
-- derivable via a FK, e.g. marks -> student), because RLS policies are per-table and must
-- filter without a join. This is the standard shape for shared-schema RLS tenancy.

CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,   -- prod tenant resolution: <subdomain>.app.tld
  code TEXT UNIQUE NOT NULL,        -- dev/login tenant resolution: short school code
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Founding school (id = 1) inherits the existing single-tenant identity from school_settings.
INSERT INTO schools (id, name, subdomain, code)
SELECT 1,
       name,
       lower(regexp_replace(short_name, '[^a-zA-Z0-9]+', '-', 'g')),
       short_name
FROM school_settings
ORDER BY id
LIMIT 1;

-- Safety net for a hypothetical empty settings table.
INSERT INTO schools (id, name, subdomain, code)
SELECT 1, 'My School', 'demo', 'DEMO'
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE id = 1);

SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));

-- ── Stamp school_id onto every tenant-scoped table ──
-- (schools, school_signups and schema_migrations are platform-global and stay untouched.)
ALTER TABLE school_settings   ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE grade_bands       ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE users             ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE classes           ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE subjects          ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE class_subjects    ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE students          ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE academic_terms    ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE attendance        ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assessments       ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE marks             ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE results_release   ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE remarks           ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE fee_structures    ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE fee_invoices      ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE payments          ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE announcements     ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE sms_log           ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE timetable         ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE messages          ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE otp_codes         ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE staff_permissions ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE remark_templates  ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE notifications     ADD COLUMN school_id INT NOT NULL DEFAULT 1 REFERENCES schools(id) ON DELETE CASCADE;

-- ── Globally-unique identifiers become unique PER SCHOOL ──
-- Two schools must each be able to have an 'admin' username, a 'MATH' subject code, a
-- 'Term 1' of '2025/2026', and their own student-code sequence. (students.qr_token and
-- payments.receipt_no/paystack_ref stay globally unique — they're random/external refs.)
ALTER TABLE users          DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users          ADD CONSTRAINT users_school_username_key UNIQUE (school_id, username);

ALTER TABLE subjects       DROP CONSTRAINT IF EXISTS subjects_code_key;
ALTER TABLE subjects       ADD CONSTRAINT subjects_school_code_key UNIQUE (school_id, code);

ALTER TABLE students       DROP CONSTRAINT IF EXISTS students_student_code_key;
ALTER TABLE students       ADD CONSTRAINT students_school_code_key UNIQUE (school_id, student_code);

ALTER TABLE academic_terms DROP CONSTRAINT IF EXISTS academic_terms_year_term_key;
ALTER TABLE academic_terms ADD CONSTRAINT academic_terms_school_year_term_key UNIQUE (school_id, year, term);

-- Helpful indexes for the per-tenant filtering RLS will lean on.
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_attendance_school ON attendance(school_id);
CREATE INDEX idx_marks_school ON marks(school_id);
CREATE INDEX idx_payments_school ON payments(school_id);
