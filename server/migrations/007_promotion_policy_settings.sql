-- Configurable promotion/grading policy. Pass/fail is decided by promotion_pass_mark (a
-- dedicated numeric cutoff), not by string-matching grade_bands.remark, since remarks are
-- free text with no guaranteed "Fail" marker.
ALTER TABLE school_settings ADD COLUMN promotion_pass_mark NUMERIC NOT NULL DEFAULT 50;
ALTER TABLE school_settings ADD COLUMN promotion_min_average NUMERIC NOT NULL DEFAULT 50;
ALTER TABLE school_settings ADD COLUMN promotion_max_failed_subjects INT NOT NULL DEFAULT 3;
ALTER TABLE school_settings ADD COLUMN promotion_distinction_threshold NUMERIC NOT NULL DEFAULT 75;
ALTER TABLE school_settings ADD COLUMN promotion_core_subjects_must_pass BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE school_settings ADD COLUMN promotion_carry_over_allowed BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE school_settings ADD COLUMN promotion_automatic BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE school_settings ADD COLUMN promotion_manual_override_allowed BOOLEAN NOT NULL DEFAULT true;
