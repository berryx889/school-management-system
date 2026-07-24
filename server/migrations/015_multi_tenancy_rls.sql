-- ── Multi-tenancy, Phase 2: row-level-security enforcement ──
--
-- Turns on RLS + a per-tenant isolation policy on every tenant table, and switches
-- school_id's default from the literal 1 to the request's tenant (the app.school_id session
-- variable the tenant middleware sets). The running server connects as a NON-SUPERUSER role
-- (sms_app) which IS subject to these policies; migrations and seed connect as the owner,
-- which BYPASSES RLS — exactly what those trusted, cross-tenant paths need.
--
-- Policy expression uses NULLIF(current_setting('app.school_id', true), '')::int so that an
-- unset/blank session variable yields NULL (row excluded) rather than a cast error — the app
-- fails CLOSED: a query that somehow forgot to set the tenant sees nothing.
--
-- Default uses COALESCE(..., 1) so the owner-run seed (no session var) still stamps school 1,
-- while any app insert that forgot to set the tenant would default to 1 and then be REJECTED
-- by the WITH CHECK policy (1 <> NULL). Belt and suspenders.

-- New-school inserts happen via the admin pool (owner, bypasses RLS); sms_app sees only its own.
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_self ON schools
  USING (id = NULLIF(current_setting('app.school_id', true), '')::int)
  WITH CHECK (id = NULLIF(current_setting('app.school_id', true), '')::int);

-- Helper applied to all 24 tenant tables below.
DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'school_settings','grade_bands','users','classes','subjects','class_subjects',
    'students','academic_terms','attendance','assessments','marks','results_release',
    'remarks','fee_structures','fee_invoices','payments','announcements','sms_log',
    'timetable','messages','otp_codes','staff_permissions','remark_templates','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (school_id = NULLIF(current_setting(''app.school_id'', true), '''')::int) '
      'WITH CHECK (school_id = NULLIF(current_setting(''app.school_id'', true), '''')::int)',
      t
    );
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN school_id '
      'SET DEFAULT COALESCE(NULLIF(current_setting(''app.school_id'', true), '''')::int, 1)',
      t
    );
  END LOOP;
END $$;
