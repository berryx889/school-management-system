import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let adminToken;
let teacherToken;
let houseId;
let studentId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'super_admin');
  teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  studentId = (await pool.query("SELECT id FROM students WHERE student_code='STU0001'")).rows[0].id;
});

after(async () => {
  if (studentId) await pool.query('UPDATE students SET house_id=NULL WHERE id=$1', [studentId]);
  if (houseId) {
    await pool.query('DELETE FROM house_points WHERE house_id=$1', [houseId]);
    await pool.query('DELETE FROM houses WHERE id=$1', [houseId]);
  }
  await stopServer(ctx.server);
  await pool.end();
});

test('admin creates a house and assigns a student', async () => {
  const created = await request(ctx.baseUrl, '/houses', { method: 'POST', token: adminToken, body: { name: 'Test Courage House', color: '#DC2626', motto: 'Always forward' } });
  assert.equal(created.status, 201);
  houseId = created.data.id;

  const assigned = await request(ctx.baseUrl, '/houses/assign', { method: 'POST', token: adminToken, body: { student_id: studentId, house_id: houseId } });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.data.house_id, houseId);
});

test('teacher awards points and standings update', async () => {
  const award = await request(ctx.baseUrl, '/houses/points', { method: 'POST', token: teacherToken, body: { student_id: studentId, points: 15, category: 'achievement', reason: 'Excellent class contribution' } });
  assert.equal(award.status, 201);

  const standings = await request(ctx.baseUrl, '/houses', { token: teacherToken });
  assert.equal(standings.status, 200);
  const house = standings.data.find((item) => item.id === houseId);
  assert.equal(house.total_points, 15);
  assert.ok(house.member_count >= 1);
});

test('points cannot be recorded for a student without a house', async () => {
  await pool.query('UPDATE students SET house_id=NULL WHERE id=$1', [studentId]);
  const res = await request(ctx.baseUrl, '/houses/points', { method: 'POST', token: teacherToken, body: { student_id: studentId, points: 5, reason: 'Should fail' } });
  assert.equal(res.status, 400);
});
