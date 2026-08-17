-- Each single-school deployment starts with one founding Super Admin. Additional ordinary
-- admins can still be created later without receiving authority over Super Admin accounts.
UPDATE users
SET role = 'super_admin'
WHERE id IN (
  SELECT DISTINCT ON (school_id) id
  FROM users
  WHERE role = 'admin' AND deleted_at IS NULL
  ORDER BY school_id, created_at, id
);
