-- Platform ownership is a property layered on top of the school-admin role, not a role of
-- its own: whoever runs the SaaS is also the admin of their own school, so a separate enum
-- value would strip their day-to-day admin abilities. A boolean flag keeps both.
--
-- The lead queue (school_signups) and any future cross-tenant surface gate on this flag, so
-- that once real customer schools exist, THEIR admins never see the platform's leads.
ALTER TABLE users ADD COLUMN is_platform_owner BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap: every admin that exists at migration time (the single founding admin in a
-- single-tenant install) becomes the platform owner. Admins created afterwards — i.e. the
-- admins of customer schools onboarded later — default to false and stay scoped to their
-- own school.
UPDATE users SET is_platform_owner = true WHERE role = 'admin';
