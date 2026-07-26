import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// The platform control plane: only the platform owner can provision/list/suspend schools,
// and a provisioned school is immediately usable (its admin can log in, scoped to that tenant).

let ctx;
let ownerToken;
let otherAdminToken;
let createdSchoolId;

before(async () => {
  ctx = await startServer();
  ownerToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  // A non-platform-owner admin (defaults is_platform_owner=false).
  await request(ctx.baseUrl, '/staff', {
    method: 'POST', token: ownerToken,
    body: { role: 'admin', full_name: 'Plain Admin', username: 'plainadmin', password: 'plain12345' },
  });
  otherAdminToken = await login(ctx.baseUrl, 'plainadmin', 'plain12345', 'admin');
});

after(async () => {
  if (createdSchoolId) await pool.query('DELETE FROM schools WHERE id=$1', [createdSchoolId]);
  await pool.query("DELETE FROM users WHERE username='plainadmin' AND school_id=1");
  await stopServer(ctx.server);
  await pool.end();
});

test('a non-platform-owner admin is forbidden from the control plane', async () => {
  assert.equal((await request(ctx.baseUrl, '/schools', { token: otherAdminToken })).status, 403);
  assert.equal((await request(ctx.baseUrl, '/schools', { method: 'POST', token: otherAdminToken, body: { name: 'X', code: 'X' } })).status, 403);
});

test('the platform owner can list all schools (cross-tenant)', async () => {
  const r = await request(ctx.baseUrl, '/schools', { token: ownerToken });
  assert.equal(r.status, 200);
  assert.ok(r.data.some((s) => s.id === 1), 'founding school present');
  assert.ok(r.data[0].user_count !== undefined, 'includes counts');
});

test('provisioning a school creates it with an admin who can log in to that tenant', async () => {
  const created = await request(ctx.baseUrl, '/schools', {
    method: 'POST', token: ownerToken,
    body: { name: 'Provision Test School', code: 'PROVTEST', admin_full_name: 'Prov Admin', admin_password: 'prov12345' },
  });
  assert.equal(created.status, 201);
  createdSchoolId = created.data.id;
  assert.equal(created.data.admin_temp_password, 'prov12345');

  // The new admin logs in WITH the new school's code and lands in the new tenant.
  const loginRes = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'prov12345', portal: 'staff', schoolCode: 'PROVTEST' },
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.user.school_id, createdSchoolId);

  // Fresh tenant starts empty — proves it's isolated, not seeing school 1's roster.
  const students = await request(ctx.baseUrl, '/students', { token: loginRes.data.token });
  assert.equal(students.data.total, 0);
});

test('duplicate code is rejected with 409', async () => {
  const dup = await request(ctx.baseUrl, '/schools', {
    method: 'POST', token: ownerToken, body: { name: 'Another', code: 'PROVTEST' },
  });
  assert.equal(dup.status, 409);
});

test('suspending a school blocks login to it', async () => {
  const patched = await request(ctx.baseUrl, `/schools/${createdSchoolId}`, {
    method: 'PATCH', token: ownerToken, body: { is_active: false },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.is_active, false);

  const blocked = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'prov12345', portal: 'staff', schoolCode: 'PROVTEST' },
  });
  assert.equal(blocked.status, 400); // suspended school no longer resolves
});
