import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Staff-permission grants are additive: they extend marks/remarks-entry rights to extra
// staff without ever removing the subject teacher's or class teacher's inherent rights.

let ctx;
let adminToken;
let ownerTeacherToken;
let outsiderTeacherToken;
let outsiderTeacherId;
let studentId;
let assessmentId;
let classSubjectId;
let subjectId;
let termId;
let grantId;

const CLASS_ID = 4; // JHS2, matches the fixture convention in marks-ownership.test.js

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  const ownerLogin = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'teacher1', password: 'teacher123', portal: 'staff' },
  });
  ownerTeacherToken = ownerLogin.data.token;
  const ownerTeacherId = ownerLogin.data.user.id;

  const { data: classSubjects } = await request(ctx.baseUrl, `/class-subjects?class_id=${CLASS_ID}`, { token: adminToken });
  const owned = classSubjects.find((cs) => cs.teacher_id === ownerTeacherId);
  assert.ok(owned, 'fixture: expected at least one class-subject in JHS2 owned by teacher1');
  classSubjectId = owned.id;
  subjectId = owned.subject_id;

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;

  const { data: students } = await request(ctx.baseUrl, `/students?class_id=${CLASS_ID}&limit=1`, { token: adminToken });
  studentId = students.data[0].id;

  const { data: assessment } = await request(ctx.baseUrl, '/assessments', {
    method: 'POST',
    token: adminToken,
    body: { class_subject_id: classSubjectId, term_id: termId, type: 'class_score', title: 'Permissions test CA', max_score: 50, weight: 50 },
  });
  assessmentId = assessment.id;

  const { data: outsider } = await request(ctx.baseUrl, '/teachers', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'Grant Outsider Teacher', username: 'grant_outsider_test', password: 'outsider123' },
  });
  outsiderTeacherId = outsider.id;
  outsiderTeacherToken = await login(ctx.baseUrl, 'grant_outsider_test', 'outsider123', 'teacher');
});

after(async () => {
  await pool.query('DELETE FROM notifications WHERE user_id=$1', [outsiderTeacherId]);
  await pool.query('DELETE FROM staff_permissions WHERE user_id=$1', [outsiderTeacherId]);
  await pool.query('DELETE FROM marks WHERE assessment_id=$1', [assessmentId]);
  await pool.query('DELETE FROM assessments WHERE id=$1', [assessmentId]);
  await pool.query('DELETE FROM users WHERE id=$1', [outsiderTeacherId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('outsider with no grant and no ownership is still rejected (regression guard)', async () => {
  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 30 }] },
  });
  assert.equal(res.status, 403);
});

test('admin can grant an outsider marks_entry for the class+subject', async () => {
  const res = await request(ctx.baseUrl, '/permissions', {
    method: 'POST',
    token: adminToken,
    body: { user_id: outsiderTeacherId, permission_type: 'marks_entry', class_id: CLASS_ID, subject_id: subjectId },
  });
  assert.equal(res.status, 201);
  grantId = res.data.id;
});

test('a duplicate grant is rejected with 409, not a second row', async () => {
  const res = await request(ctx.baseUrl, '/permissions', {
    method: 'POST',
    token: adminToken,
    body: { user_id: outsiderTeacherId, permission_type: 'marks_entry', class_id: CLASS_ID, subject_id: subjectId },
  });
  assert.equal(res.status, 409);
  const { rows } = await pool.query('SELECT * FROM staff_permissions WHERE user_id=$1', [outsiderTeacherId]);
  assert.equal(rows.length, 1);
});

test('granted outsider can now submit marks, and the original owning teacher still can too', async () => {
  const outsiderRes = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 33 }] },
  });
  assert.equal(outsiderRes.status, 200);
  assert.equal(Number(outsiderRes.data[0].score), 33);

  const ownerRes = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: ownerTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 44 }] },
  });
  assert.equal(ownerRes.status, 200);
  assert.equal(Number(ownerRes.data[0].score), 44);
});

test('revoking the grant removes the outsider\'s access again', async () => {
  const del = await request(ctx.baseUrl, `/permissions/${grantId}`, { method: 'DELETE', token: adminToken });
  assert.equal(del.status, 204);

  const res = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: studentId, score: 20 }] },
  });
  assert.equal(res.status, 403);
});
