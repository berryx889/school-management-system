CREATE TABLE learning_posts (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL DEFAULT NULLIF(current_setting('app.school_id', true), '')::int REFERENCES schools(id),
  class_id INT NOT NULL REFERENCES classes(id),
  author_id INT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('homework','library','examinations','online-classes')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  scheduled_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE homework_submissions (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL DEFAULT NULLIF(current_setting('app.school_id', true), '')::int REFERENCES schools(id),
  post_id INT NOT NULL REFERENCES learning_posts(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id),
  answer TEXT NOT NULL,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (post_id, student_id)
);
CREATE TABLE teacher_feedback (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL DEFAULT NULLIF(current_setting('app.school_id', true), '')::int REFERENCES schools(id),
  student_id INT NOT NULL REFERENCES students(id),
  teacher_id INT NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, teacher_id)
);
CREATE INDEX learning_posts_class ON learning_posts(school_id, class_id, kind);
CREATE INDEX homework_student ON homework_submissions(school_id, student_id);
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['learning_posts','homework_submissions','teacher_feedback'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (school_id = NULLIF(current_setting(''app.school_id'', true), '''')::int) WITH CHECK (school_id = NULLIF(current_setting(''app.school_id'', true), '''')::int)', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_posts, homework_submissions, teacher_feedback TO sms_app;
GRANT USAGE, SELECT ON SEQUENCE learning_posts_id_seq, homework_submissions_id_seq, teacher_feedback_id_seq TO sms_app;
