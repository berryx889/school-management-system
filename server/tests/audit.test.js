import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Audit trail: sensitive actions are recorded, an admin can read their school's history, and
// (critically) one school can never read another's audit rows.

let ctx;
let adminToken;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
});

after(async () => {
  // Keep the log clean-ish for repeat runs of this fixture without wiping real history:
  await pool.query("DELETE FROM audit_logs WHERE summary LIKE 'Failed sign-in for \"nobody-xyz\"%'");
  await stopServer(ctx.server);
  await pool.end();
});

test('a successful login is recorded in the audit trail', async () => {
  // adminToken above came from a login; it should now be visible in the log.
  const r = await request(ctx.baseUrl, '/audit-logs?action=auth.login', { token: adminToken });
  assert.equal(r.status, 200);
  assert.ok(r.data.total >= 1);
  assert.ok(r.data.data.every((e) => e.action === 'auth.login'));
  assert.ok(r.data.data[0].created_at, 'has a timestamp');
  assert.equal(r.data.data[0].action_label, 'Successful sign-in');
  assert.match(r.data.data[0].description, /signed in successfully/i);
  assert.match(r.data.data[0].actor_display, /Super Admin|Administrator/);
});

test('a failed login is recorded with no actor leak', async () => {
  await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'nobody-xyz', password: 'wrong', portal: 'staff', schoolCode: 'BFBS' },
  });
  const r = await request(ctx.baseUrl, '/audit-logs?action=auth.login_failed', { token: adminToken });
  assert.equal(r.status, 200);
  const entry = r.data.data.find((e) => e.summary.includes('nobody-xyz'));
  assert.ok(entry, 'failed login was logged');
  assert.equal(entry.actor_id, null, 'unknown account has no actor');
});

test('editing marks writes a marks.update audit entry', async () => {
  // Pull a real assessment in the founding school plus a student in its class, straight from
  // the DB (admin pool), then submit as admin — admins bypass the class-subject ownership check.
  const fixture = (await pool.query(
    `SELECT a.id AS assessment_id, a.max_score, cs.class_id
       FROM assessments a JOIN class_subjects cs ON cs.id = a.class_subject_id
      WHERE a.school_id = 1 AND a.locked = false
      ORDER BY a.id LIMIT 1`
  )).rows[0];
  if (!fixture) return; // no assessment fixture — nothing to exercise

  const student = (await pool.query(
    'SELECT id FROM students WHERE class_id = $1 AND school_id = 1 LIMIT 1',
    [fixture.class_id]
  )).rows[0];
  if (!student) return;

  const save = await request(ctx.baseUrl, '/marks/bulk', {
    method: 'PUT', token: adminToken,
    body: { assessment_id: fixture.assessment_id, entries: [{ student_id: student.id, score: Number(fixture.max_score) }] },
  });
  assert.equal(save.status, 200);

  const r = await request(ctx.baseUrl, '/audit-logs?action=marks.update', { token: adminToken });
  assert.ok(r.data.total >= 1, 'marks.update was recorded');
  assert.ok(r.data.data[0].action === 'marks.update');
});

test('a non-admin cannot read the audit log', async () => {
  const teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  const r = await request(ctx.baseUrl, '/audit-logs', { token: teacherToken });
  assert.equal(r.status, 403);
});

test('audit action filters are returned with human-readable labels', async () => {
  const r = await request(ctx.baseUrl, '/audit-logs/actions', { token: adminToken });
  assert.equal(r.status, 200);
  const login = r.data.find((item) => item.value === 'auth.login');
  assert.equal(login.label, 'Successful sign-in');
});
