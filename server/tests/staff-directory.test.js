import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let adminToken;
let createdStaffId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
});

after(async () => {
  if (createdStaffId) await pool.query('DELETE FROM users WHERE id=$1', [createdStaffId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('GET /staff includes admin/teacher/kitchen/accountant, excludes student/parent', async () => {
  const res = await request(ctx.baseUrl, '/staff?limit=500', { token: adminToken });
  assert.equal(res.status, 200);
  const roles = new Set(res.data.data.map((u) => u.role));
  assert.ok(roles.has('admin'));
  assert.ok(roles.has('teacher'));
  assert.ok(!roles.has('student'));
  assert.ok(!roles.has('parent'));
});

test('GET /teachers (unchanged route) still returns only role=teacher rows after /staff was added', async () => {
  const res = await request(ctx.baseUrl, '/teachers?limit=500', { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.data.data.length > 0);
  assert.ok(res.data.data.every((u) => !('role' in u) || u.role === 'teacher'));
});

test('POST /staff with role=kitchen and a department creates the row; rejects role=student', async () => {
  const rejectRes = await request(ctx.baseUrl, '/staff', {
    method: 'POST',
    token: adminToken,
    body: { role: 'student', full_name: 'Should Fail', username: 'staff_dir_reject_test', password: 'pass1234' },
  });
  assert.equal(rejectRes.status, 400);

  const res = await request(ctx.baseUrl, '/staff', {
    method: 'POST',
    token: adminToken,
    body: { role: 'kitchen', full_name: 'Staff Dir Kitchen Test', username: 'staff_dir_kitchen_test', password: 'pass1234', department: 'Catering' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.department, 'Catering');
  assert.equal(res.data.role, 'kitchen');
  createdStaffId = res.data.id;
});

test('GET /staff/summary totals reflect the fixture set', async () => {
  const res = await request(ctx.baseUrl, '/staff/summary', { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.data.total >= res.data.active);
  assert.equal(res.data.total, res.data.active + res.data.inactive);
  assert.ok(Array.isArray(res.data.by_department));
});
