-- Public "interest" signups from prospective schools (scoped-down Phase 4 of the eventual
-- multi-tenant roadmap: no tenant provisioning exists yet, this is just a lead queue for
-- the platform owner to manually review and follow up with).
CREATE TABLE school_signups (
  id SERIAL PRIMARY KEY,
  school_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  desired_subdomain TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
