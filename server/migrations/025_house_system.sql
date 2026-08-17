CREATE TABLE houses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  motto TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  school_id INT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.school_id', true), '')::int, 1) REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

ALTER TABLE students ADD COLUMN house_id INT REFERENCES houses(id) ON DELETE SET NULL;

CREATE TABLE house_points (
  id SERIAL PRIMARY KEY,
  house_id INT NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE SET NULL,
  points INT NOT NULL CHECK (points BETWEEN -1000 AND 1000 AND points <> 0),
  category TEXT NOT NULL DEFAULT 'general',
  reason TEXT NOT NULL,
  awarded_by INT REFERENCES users(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  school_id INT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.school_id', true), '')::int, 1) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_houses_school ON houses(school_id);
CREATE INDEX idx_house_points_school ON house_points(school_id);
CREATE INDEX idx_house_points_house ON house_points(house_id, awarded_at DESC);
CREATE INDEX idx_students_house ON students(house_id);

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON houses
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::int);

ALTER TABLE house_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON house_points
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::int);
