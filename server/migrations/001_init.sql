-- Core schema for the school management system

CREATE TABLE school_settings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My School',
  short_name TEXT NOT NULL DEFAULT 'SCH',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  motto TEXT,
  current_academic_year TEXT NOT NULL DEFAULT '2025/2026',
  current_term TEXT NOT NULL DEFAULT 'Term 1',
  primary_color TEXT NOT NULL DEFAULT '#5B4FE9',
  class_score_weight INT NOT NULL DEFAULT 50,
  exam_score_weight INT NOT NULL DEFAULT 50,
  late_threshold TIME NOT NULL DEFAULT '07:45',
  attendance_edit_cutoff TIME NOT NULL DEFAULT '10:00',
  announcement_requires_approval BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE grade_bands (
  id SERIAL PRIMARY KEY,
  min_score INT NOT NULL,
  max_score INT NOT NULL,
  grade TEXT NOT NULL,
  remark TEXT NOT NULL
);

CREATE TYPE user_role AS ENUM ('admin','teacher','student','parent','kitchen');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  class_teacher_id INT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL
);

CREATE TABLE class_subjects (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(class_id, subject_id)
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_code TEXT UNIQUE NOT NULL,
  class_id INT REFERENCES classes(id) ON DELETE SET NULL,
  dob DATE,
  gender TEXT,
  parent_id INT REFERENCES users(id) ON DELETE SET NULL,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE academic_terms (
  id SERIAL PRIMARY KEY,
  year TEXT NOT NULL,
  term TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(year, term)
);

CREATE TYPE attendance_status AS ENUM ('present','absent','late');
CREATE TYPE attendance_method AS ENUM ('qr','manual');

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  check_in_time TIME,
  method attendance_method NOT NULL,
  marked_by INT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(student_id, date)
);

CREATE TYPE assessment_type AS ENUM ('class_score','exam');

CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  class_subject_id INT NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  term_id INT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  type assessment_type NOT NULL,
  title TEXT NOT NULL,
  max_score NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE marks (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  entered_by INT REFERENCES users(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

CREATE TABLE results_release (
  id SERIAL PRIMARY KEY,
  term_id INT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ,
  released_by INT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(term_id, class_id)
);

CREATE TABLE remarks (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  class_teacher_remark TEXT,
  head_teacher_remark TEXT,
  UNIQUE(student_id, term_id)
);

CREATE TABLE fee_structures (
  id SERIAL PRIMARY KEY,
  term_id INT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

CREATE TABLE fee_invoices (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  total_due NUMERIC NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

CREATE TYPE payment_method AS ENUM ('cash','momo','card','bank');
CREATE TYPE payment_status AS ENUM ('pending','success','failed');

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method payment_method NOT NULL,
  paystack_ref TEXT UNIQUE,
  status payment_status NOT NULL DEFAULT 'pending',
  recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  receipt_no TEXT UNIQUE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE announcement_audience AS ENUM ('all','class','parents','teachers');
CREATE TYPE announcement_status AS ENUM ('draft','pending_approval','sent');

CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience announcement_audience NOT NULL,
  class_id INT REFERENCES classes(id) ON DELETE SET NULL,
  send_sms BOOLEAN NOT NULL DEFAULT false,
  status announcement_status NOT NULL DEFAULT 'sent',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sms_log (
  id SERIAL PRIMARY KEY,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_ref TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE timetable (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  period_no INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(class_id, day_of_week, period_no)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO school_settings (name, short_name, address, phone, motto)
VALUES ('Bright Future Basic School', 'BFBS', 'Accra, Ghana', '0200000000', 'Knowledge is Light');

INSERT INTO grade_bands (min_score, max_score, grade, remark) VALUES
  (80, 100, '1', 'Excellent'),
  (70, 79, '2', 'Very good'),
  (60, 69, '3', 'Good'),
  (55, 59, '4', 'Credit'),
  (50, 54, '5', 'Pass'),
  (0, 49, '6', 'Fail');
