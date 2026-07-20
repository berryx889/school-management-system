-- Reusable remark-text bank for the Remark Sheet's quick-pick UI.
CREATE TABLE remark_templates (
  id SERIAL PRIMARY KEY,
  remark_type TEXT NOT NULL,
  remark_text TEXT NOT NULL,
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
