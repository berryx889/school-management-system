import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// PUT /results/remarks previously had no ownership check at all (dead capability, no
// client ever called it). This documents the newly-added class-teacher/grant enforcement.

let ctx;
let adminToken;
let classTeacherToken;
let outsiderTeacherToken;
let outsiderTeacherId;
let studentId;
let termId;

const CLASS_ID = 4; // JHS2, class_teacher_id is teacher1 per seed data

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  classTeacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;

  const { data: students } = await request(ctx.baseUrl, `/students?class_id=${CLASS_ID}&limit=1`, { token: adminToken });
  studentId = students.data[0].id;

  const { data: outsider } = await request(ctx.baseUrl, '/teachers', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'Remarks Outsider Teacher', username: 'remarks_outsider_test', password: 'outsider123' },
  });
  outsiderTeacherId = outsider.id;
  outsiderTeacherToken = await login(ctx.baseUrl, 'remarks_outsider_test', 'outsider123', 'teacher');
});

after(async () => {
  await pool.query('DELETE FROM staff_permissions WHERE user_id=$1', [outsiderTeacherId]);
  await pool.query('DELETE FROM remarks WHERE student_id=$1 AND term_id=$2', [studentId, termId]);
  await pool.query('DELETE FROM users WHERE id=$1', [outsiderTeacherId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('a teacher who is neither the class teacher nor granted remarks_entry is rejected (403)', async () => {
  const res = await request(ctx.baseUrl, '/results/remarks', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { student_id: studentId, term_id: termId, class_teacher_remark: 'Should not save' },
  });
  assert.equal(res.status, 403);
});

test('the actual class teacher can save a remark via the single endpoint', async () => {
  const res = await request(ctx.baseUrl, '/results/remarks', {
    method: 'PUT',
    token: classTeacherToken,
    body: { student_id: studentId, term_id: termId, class_teacher_remark: 'Good progress this term.' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.class_teacher_remark, 'Good progress this term.');
});

test('an admin-granted remarks_entry permission lets an outsider save via the bulk endpoint, reflected in GET /remarks', async () => {
  const grantRes = await request(ctx.baseUrl, '/permissions', {
    method: 'POST',
    token: adminToken,
    body: { user_id: outsiderTeacherId, permission_type: 'remarks_entry', class_id: CLASS_ID },
  });
  assert.equal(grantRes.status, 201);

  const bulkRes = await request(ctx.baseUrl, '/results/remarks/bulk', {
    method: 'PUT',
    token: outsiderTeacherToken,
    body: { class_id: CLASS_ID, term_id: termId, entries: [{ student_id: studentId, class_teacher_remark: 'Bulk-saved remark.' }] },
  });
  assert.equal(bulkRes.status, 200);

  const readRes = await request(ctx.baseUrl, `/results/remarks?class_id=${CLASS_ID}&term_id=${termId}`, { token: adminToken });
  assert.equal(readRes.status, 200);
  const mine = readRes.data.find((r) => r.student_id === studentId);
  assert.equal(mine.class_teacher_remark, 'Bulk-saved remark.');
});

test('admin bypass always works regardless of grants', async () => {
  const res = await request(ctx.baseUrl, '/results/remarks', {
    method: 'PUT',
    token: adminToken,
    body: { student_id: studentId, term_id: termId, head_teacher_remark: 'Admin note.' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.head_teacher_remark, 'Admin note.');
});
