import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from './db/pool.js';

async function upsertUser({ role, username, password, full_name, phone }) {
  const password_hash = await bcrypt.hash(password, 10);
  const existing = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  if (existing.rows.length) return existing.rows[0].id;
  const { rows } = await pool.query(
    `INSERT INTO users (role, username, password_hash, full_name, phone)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [role, username, password_hash, full_name, phone]
  );
  return rows[0].id;
}

async function seed() {
  console.log('Seeding...');

  const adminId = await upsertUser({
    role: 'admin',
    username: 'admin',
    password: 'admin123',
    full_name: 'School Administrator',
    phone: '233200000001',
  });

  const kitchenId = await upsertUser({
    role: 'kitchen',
    username: 'kitchen',
    password: 'kitchen123',
    full_name: 'Kitchen Staff',
    phone: '233200000002',
  });

  let term = await pool.query('SELECT id FROM academic_terms WHERE is_current=true');
  let termId;
  if (term.rows.length) {
    termId = term.rows[0].id;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO academic_terms (year, term, start_date, end_date, is_current)
       VALUES ('2025/2026','Term 1','2026-01-12','2026-04-03', true) RETURNING id`
    );
    termId = rows[0].id;
  }

  const classNames = [
    ['Creche', 'Nursery'],
    ['KG 1', 'Kindergarten'],
    ['Basic 4', 'Primary'],
    ['JHS 2', 'JHS'],
  ];
  const classIds = [];
  for (const [name, level] of classNames) {
    const existing = await pool.query('SELECT id FROM classes WHERE name=$1', [name]);
    if (existing.rows.length) {
      classIds.push(existing.rows[0].id);
    } else {
      const { rows } = await pool.query(
        'INSERT INTO classes (name, level) VALUES ($1,$2) RETURNING id',
        [name, level]
      );
      classIds.push(rows[0].id);
    }
  }

  const subjectDefs = [
    ['English Language', 'ENG'],
    ['Mathematics', 'MATH'],
    ['Integrated Science', 'SCI'],
    ['Social Studies', 'SOC'],
  ];
  const subjectIds = [];
  for (const [name, code] of subjectDefs) {
    const existing = await pool.query('SELECT id FROM subjects WHERE code=$1', [code]);
    if (existing.rows.length) {
      subjectIds.push(existing.rows[0].id);
    } else {
      const { rows } = await pool.query(
        'INSERT INTO subjects (name, code) VALUES ($1,$2) RETURNING id',
        [name, code]
      );
      subjectIds.push(rows[0].id);
    }
  }

  const teacherId = await upsertUser({
    role: 'teacher',
    username: 'teacher1',
    password: 'teacher123',
    full_name: 'Mrs. Abena Owusu',
    phone: '233200000003',
  });

  const jhs2Id = classIds[3];
  await pool.query('UPDATE classes SET class_teacher_id=$1 WHERE id=$2', [teacherId, jhs2Id]);

  for (const subjectId of subjectIds) {
    await pool.query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id)
       VALUES ($1,$2,$3) ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id=$3`,
      [jhs2Id, subjectId, teacherId]
    );
  }

  const parentId = await upsertUser({
    role: 'parent',
    username: '233200000099',
    password: 'parent123',
    full_name: 'Mr. Kwame Mensah',
    phone: '233200000099',
  });

  const studentUserId = await upsertUser({
    role: 'student',
    username: 'STU0001',
    password: 'student123',
    full_name: 'Kofi Mensah',
    phone: '233200000099',
  });

  const existingStudent = await pool.query('SELECT id FROM students WHERE student_code=$1', [
    'STU0001',
  ]);
  if (!existingStudent.rows.length) {
    await pool.query(
      `INSERT INTO students (user_id, student_code, class_id, dob, gender, parent_id, qr_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        studentUserId,
        'STU0001',
        jhs2Id,
        '2012-03-14',
        'male',
        parentId,
        crypto.randomUUID(),
      ]
    );
  }

  console.log('Seed complete.');
  console.log('  admin / admin123');
  console.log('  teacher1 / teacher123');
  console.log('  STU0001 / student123');
  console.log('  233200000099 / parent123 (parent)');
  console.log('  kitchen / kitchen123');

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
