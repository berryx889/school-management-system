-- Soft deletes for the entities whose hard DELETE currently cascades into irreplaceable
-- records: deleting a class/subject/class-subject/assessment used to CASCADE all the way down
-- to marks, permanently destroying students' scores. (students, teachers and staff already
-- soft-delete via status/is_active; payments, marks and results have no delete path at all.)
--
-- Approach: add deleted_at; the DELETE routes now stamp it instead of removing rows, and the
-- LIST/picker queries filter deleted_at IS NULL. Historical joins by id still resolve, so old
-- report cards and records stay intact — the row is hidden, never lost.
ALTER TABLE classes        ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE subjects       ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE class_subjects ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE assessments    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE fee_structures ADD COLUMN deleted_at TIMESTAMPTZ;
