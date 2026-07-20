-- New finance-scoped staff role. Must be the only statement in this migration file:
-- Postgres forbids using a new enum value in the same transaction that added it.
ALTER TYPE user_role ADD VALUE 'accountant';
