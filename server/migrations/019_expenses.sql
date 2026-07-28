-- Expense tracking so a school records money going OUT (salaries, electricity, fuel,
-- repairs, stationery…) alongside the fee income already tracked in payments — enabling a
-- real income statement. Tenant-scoped + RLS like every other table; soft-deletes for parity
-- with the rest of the finance data.
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.school_id', true), '')::int, 1) REFERENCES schools(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_school_date ON expenses (school_id, expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON expenses
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::int);

GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO sms_app;
GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO sms_app;
