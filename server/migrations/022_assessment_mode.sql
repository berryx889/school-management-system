-- WAEC-style assessment mode: a descriptive category for how the assessment was conducted
-- (Individual Class Assessments, Mid-Semester, Practical/Portfolio, Group Projects, Supervised
-- Termly, End of Semester Exam). This is organizational only — grade computation still keys off
-- `type` (class_score vs exam), which the mode maps onto. Nullable so existing rows are unaffected.
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS mode TEXT;
