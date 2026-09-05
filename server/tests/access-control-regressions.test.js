import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let teacherToken;
let studentToken;
let kitchenToken;
let unauthorizedClass;
let studentId;
let termId;
let assessmentId;

before(async () => {
  ctx = await startServer();
  teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  studentToken = await login(ctx.baseUrl, 'STU0001', 'student123', 'student');
  kitchenToken = await login(ctx.baseUrl, 'kitchen', 'kitchen123', 'kitchen');

  const teacher = await pool.query("SELECT id FROM users WHERE username='teacher1' AND school_id=1");
  const unowned = await pool.query(
    `SELECT c.id FROM classes c
     WHERE c.school_id=1 AND c.deleted_at IS NULL
       AND c.class_teacher_id IS DISTINCT FROM $1
       AND NOT EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id=c.id AND cs.teacher_id=$1 AND cs.deleted_at IS NULL)
     LIMIT 1`,
    [teacher.rows[0].id]
  );
  unauthorizedClass = unowned.rows[0]?.id;
  const student = await pool.query("SELECT id FROM students WHERE school_id=1 AND status='active' LIMIT 1");
  studentId = student.rows[0].id;
  const term = await pool.query('SELECT id FROM academic_terms WHERE school_id=1 ORDER BY id LIMIT 1');
  termId = term.rows[0].id;
  const assessment = await pool.query('SELECT id FROM assessments WHERE school_id=1 AND deleted_at IS NULL LIMIT 1');
  assessmentId = assessment.rows[0]?.id;
});

after(async () => {
  await stopServer(ctx.server);
  await pool.end();
});

test('a teacher cannot submit attendance for an unrelated class', async () => {
  assert.ok(unauthorizedClass, 'fixture: expected a class unrelated to teacher1');
  const res = await request(ctx.baseUrl, '/attendance/manual', {
    method: 'POST', token: teacherToken,
    body: { class_id: unauthorizedClass, date: new Date().toISOString().slice(0, 10), records: [] },
  });
  assert.equal(res.status, 403);
});

test('non-academic staff cannot read a student attendance history', async () => {
  const res = await request(ctx.baseUrl, `/attendance?student_id=${studentId}&month=2026-01`, { token: kitchenToken });
  assert.equal(res.status, 403);
});

test('non-academic staff cannot read released or unreleased student results', async () => {
  const res = await request(ctx.baseUrl, `/results/student/${studentId}?term_id=${termId}`, { token: kitchenToken });
  assert.equal(res.status, 403);
});

test('students cannot read raw marks endpoints', async () => {
  assert.ok(assessmentId, 'fixture: expected an assessment');
  const res = await request(ctx.baseUrl, `/marks?assessment_id=${assessmentId}`, { token: studentToken });
  assert.equal(res.status, 403);
});

test('teachers cannot read private student billing records', async () => {
  const res = await request(ctx.baseUrl, `/fees/invoices?student_id=${studentId}`, { token: teacherToken });
  assert.equal(res.status, 403);
});
