import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Promotion eligibility should reflect the configured pass mark / minimum average, and
// POST /students/promote must enforce it server-side (not just hide ineligible students in
// the UI) once manual override is disallowed.

let ctx;
let adminToken;
let termId;
let classId;
let subjectId;
let classSubjectId;
let assessmentId;
let passStudentId;
let failStudentId;
let passUserId;
let failUserId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;

  const { data: cls } = await request(ctx.baseUrl, '/classes', {
    method: 'POST', token: adminToken, body: { name: 'Promotion Test Class', level: 'Test' },
  });
  classId = cls.id;

  const { rows: subjects } = await pool.query('SELECT id FROM subjects LIMIT 1');
  subjectId = subjects[0].id;

  const { data: cs } = await request(ctx.baseUrl, '/class-subjects', {
    method: 'POST', token: adminToken, body: { class_id: classId, subject_id: subjectId },
  });
  classSubjectId = cs.id;

  const { data: assessment } = await request(ctx.baseUrl, '/assessments', {
    method: 'POST', token: adminToken,
    body: { class_subject_id: classSubjectId, term_id: termId, type: 'class_score', title: 'Promotion Test CA', max_score: 100, weight: 100 },
  });
  assessmentId = assessment.id;

  const { data: passStudent } = await request(ctx.baseUrl, '/students', {
    method: 'POST', token: adminToken, body: { full_name: 'Promotion Pass Student', class_id: classId, parent_phone: '0244999004' },
  });
  passStudentId = passStudent.id;
  passUserId = passStudent.user_id;

  const { data: failStudent } = await request(ctx.baseUrl, '/students', {
    method: 'POST', token: adminToken, body: { full_name: 'Promotion Fail Student', class_id: classId, parent_phone: '0244999005' },
  });
  failStudentId = failStudent.id;
  failUserId = failStudent.user_id;

  await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT', token: adminToken,
    body: { assessment_id: assessmentId, entries: [{ student_id: passStudentId, score: 80 }, { student_id: failStudentId, score: 20 }] },
  });
});

after(async () => {
  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { promotion_manual_override_allowed: true } });
  await pool.query('DELETE FROM marks WHERE assessment_id=$1', [assessmentId]);
  await pool.query('DELETE FROM assessments WHERE id=$1', [assessmentId]);
  await pool.query('DELETE FROM class_subjects WHERE id=$1', [classSubjectId]);
  await pool.query('DELETE FROM students WHERE id = ANY($1::int[])', [[passStudentId, failStudentId]]);
  await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [[passUserId, failUserId]]);
  await pool.query("DELETE FROM users WHERE phone IN ('233244999004','233244999005') AND role='parent'");
  await pool.query('DELETE FROM classes WHERE id=$1', [classId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('eligibility reflects the pass mark and minimum average', async () => {
  const res = await request(ctx.baseUrl, `/results/promotion-eligibility?class_id=${classId}&term_id=${termId}`, { token: adminToken });
  assert.equal(res.status, 200);

  const pass = res.data.students.find((s) => s.student_id === passStudentId);
  const fail = res.data.students.find((s) => s.student_id === failStudentId);

  assert.equal(pass.average, 80);
  assert.equal(pass.eligible, true);
  assert.deepEqual(pass.reasons, []);

  assert.equal(fail.average, 20);
  assert.equal(fail.eligible, false);
  assert.ok(fail.reasons.length > 0);
  assert.ok(fail.reasons.some((r) => r.includes('Average')));
});

test('promotion is server-enforced once manual override is disallowed', async () => {
  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { promotion_manual_override_allowed: false } });

  const promote = await request(ctx.baseUrl, '/students/promote', {
    method: 'POST', token: adminToken,
    body: { student_ids: [passStudentId, failStudentId], class_id: 3, from_class_id: classId, term_id: termId },
  });
  assert.equal(promote.status, 200);
  assert.equal(promote.data.updated, 1, 'only the eligible student should have been moved');

  const passRow = await pool.query('SELECT class_id FROM students WHERE id=$1', [passStudentId]);
  const failRow = await pool.query('SELECT class_id FROM students WHERE id=$1', [failStudentId]);
  assert.equal(passRow.rows[0].class_id, 3, 'the passing student should have moved to the target class');
  assert.equal(failRow.rows[0].class_id, classId, 'the failing student must stay behind despite being in the request');
});
