-- Creates the restricted application role the running server connects as, so Postgres
-- row-level security is actually enforced. Run ONCE per database, as an admin/owner role:
--
--   psql "$DATABASE_URL" -f server/db/create_app_role.sql
--
-- Idempotent: safe to re-run. On Neon, either run this as the project owner, or skip it and
-- point DATABASE_APP_URL at a non-owner role you create in the Neon dashboard — the only
-- requirements are NOSUPERUSER and NOBYPASSRLS (a superuser silently bypasses RLS).
--
-- Local dev connects over the Unix socket with trust auth, so no password is set here. For a
-- TCP/production role, add a password:  ALTER ROLE sms_app LOGIN PASSWORD '...';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sms_app') THEN
    CREATE ROLE sms_app LOGIN;
  END IF;
END $$;

ALTER ROLE sms_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO sms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sms_app;

-- Tables/sequences created by future migrations (run by the admin role) inherit these grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sms_app;
