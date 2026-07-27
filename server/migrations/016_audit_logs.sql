-- Append-only audit trail: who did what, to which record, with before/after detail, from
-- where, and when. Tenant-scoped like every other table (an admin sees only their own
-- school's history) and enforced by RLS. Writes happen on the admin pool with an explicit
-- school_id (some events, e.g. failed logins, occur before a tenant client is established),
-- so the trail can't be tampered with from within a request's RLS scope; reads go through
-- the normal tenant client and are confined by the policy below.

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,   -- null for failed/anonymous logins
  actor_label TEXT,                                        -- denormalized so it survives user deletion
  action TEXT NOT NULL,                                    -- e.g. 'auth.login', 'marks.update', 'payment.delete'
  entity_type TEXT,                                        -- e.g. 'student', 'payment'
  entity_id TEXT,                                          -- affected record id (text for flexibility)
  summary TEXT,                                            -- human-readable one-liner
  metadata JSONB,                                          -- freeform { old, new, ... }
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_school_created ON audit_logs (school_id, created_at DESC);
CREATE INDEX idx_audit_school_action ON audit_logs (school_id, action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_logs
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::int);

-- The restricted app role reads (and the tenant client may also insert) audit rows.
GRANT SELECT, INSERT ON audit_logs TO sms_app;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO sms_app;
