import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// PRD acceptance criterion (§9): "No teacher can enter marks for a class-subject
// not assigned to them (verified server-side, not just hidden in UI)." Also
// covers the companion rule that a locked assessment rejects further writes.

let ctx;
let ownerTeacherToken;
let outsiderTeacherToken;
let outsiderTeacherId;
let studentId;
let assessmentId;
let classSubjectId;
let termId;

before(async () => {
  ctx = await startServer();
  const adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  const { data: classSubjects } = await request(ctx.baseUrl, '/class-subjects?class_id=4', { token: adminToken });
  classSubjectId = classSubjects[0].id; // owned by seeded teacher1 ("Mrs. Abena Owusu")

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;

  const { data: students } = await request(ctx.baseUrl, '/students?class_id=4&limit=1', { token: adminToken });
  studentId = students.data[0].id;

  const { status: assessStatus, data: assessment } = await request(ctx.baseUrl, '/assessments', {
    method: 'POST',
    token: adminToken,
    body: { class_subject_id: classSubjectId, term_id: termId, type: 'class_score', title: 'Ownership test CA', max_score: 50, weight: 50 },
  });
  assert.equal(assessStatus, 201, 'fixture: assessment creation should succeed');
  assessmentId = assessment.id;

  const { data: outsider } = await request(ctx.baseUrl, '/teachers', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'Outsider Teacher', username: 'outsider_teacher_test', password: 'outsider123' },
  });
  outsiderTeacherId = outsider.id;

  ownerTeacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  outsiderTeacherToken = await login(ctx.baseUrl, 'outsider_teacher_test', 'outsider123', 'teacher');
});

after(async () => {
  await pool.query('DELETE FROM marks WHERE assessment_id=$1', [assessmentId]);
  await pool.query('DELETE FROM assessments WHERE id=$1', [assessmentId]);
  await pool.query('DELETE FROM users WHERE id=$1', [outsiderTeacherId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('a teacher not assigned to the class-subject is rejected server-side (403), not just hidden in the UI', async () => {
  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 40 }] },
  });
  assert.equal(res.status, 403);

  const { rows } = await pool.query('SELECT * FROM marks WHERE assessment_id=$1', [assessmentId]);
  assert.equal(rows.length, 0, 'the rejected submission must not have written any marks');
});

test('the teacher actually assigned to the class-subject can submit marks', async () => {
  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: ownerTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 42 }] },
  });
  assert.equal(res.status, 200);
  assert.equal(Number(res.data[0].score), 42);
});

test('a score above max_score is rejected with 400 and does not overwrite the valid mark', async () => {
  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: ownerTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 999 }] },
  });
  assert.equal(res.status, 400);

  const { rows } = await pool.query('SELECT score FROM marks WHERE assessment_id=$1 AND student_id=$2', [assessmentId, studentId]);
  assert.equal(Number(rows[0].score), 42);
});

test('once an assessment is locked, even the owning teacher is rejected (423)', async () => {
  const adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  const lockRes = await request(ctx.baseUrl, `/assessments/${assessmentId}/lock`, {
    method: 'PUT',
    token: adminToken,
    body: { locked: true },
  });
  assert.equal(lockRes.status, 200);

  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: ownerTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 10 }] },
  });
  assert.equal(res.status, 423);

  const { rows } = await pool.query('SELECT score FROM marks WHERE assessment_id=$1 AND student_id=$2', [assessmentId, studentId]);
  assert.equal(Number(rows[0].score), 42, 'the score must remain unchanged once locked');
});
