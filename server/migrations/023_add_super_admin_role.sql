-- Highest school-level role. Kept separate from the removed SaaS/platform-owner concept.
-- Must be the only statement: Postgres cannot use a new enum value in the transaction
-- that adds it.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
