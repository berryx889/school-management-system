import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// The school-signup lead queue is a platform-wide surface, gated on users.is_platform_owner
// (migration 013), not on the admin role. The seeded founding admin is the platform owner;
// a second admin — standing in for a customer school's admin — must be locked out.

let ctx;
let ownerToken; // seeded 'admin', is_platform_owner = true
let otherAdminToken; // freshly created admin, is_platform_owner = false
let signupId;

before(async () => {
  ctx = await startServer();
  ownerToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  // A platform owner creates another admin. New admins default to is_platform_owner = false.
  await request(ctx.baseUrl, '/staff', {
    method: 'POST',
    token: ownerToken,
    body: { role: 'admin', full_name: 'Second Admin', username: 'admin2', password: 'admin2pass' },
  });
  otherAdminToken = await login(ctx.baseUrl, 'admin2', 'admin2pass', 'admin');
});

after(async () => {
  if (signupId) await pool.query('DELETE FROM school_signups WHERE id=$1', [signupId]);
  await pool.query("DELETE FROM users WHERE username='admin2'");
  await stopServer(ctx.server);
  await pool.end();
});

test('login response exposes is_platform_owner (true for owner, false for other admin)', async () => {
  const owner = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST', body: { username: 'admin', password: 'admin123', portal: 'staff' },
  });
  assert.equal(owner.data.user.is_platform_owner, true);

  const other = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST', body: { username: 'admin2', password: 'admin2pass', portal: 'staff' },
  });
  assert.equal(other.data.user.is_platform_owner, false);
});

test('public visitor can still submit a signup without auth', async () => {
  const res = await request(ctx.baseUrl, '/signups', {
    method: 'POST',
    body: { school_name: 'Platform Test School', contact_name: 'Ada Owner', contact_email: 'ada@platformtest.com' },
  });
  assert.equal(res.status, 201);
  signupId = res.data.id;
});

test('a non-platform-owner admin is forbidden from the lead queue', async () => {
  const list = await request(ctx.baseUrl, '/signups', { token: otherAdminToken });
  assert.equal(list.status, 403);

  const update = await request(ctx.baseUrl, `/signups/${signupId}`, {
    method: 'PATCH', token: otherAdminToken, body: { status: 'contacted' },
  });
  assert.equal(update.status, 403);
});

test('the platform owner can list and triage leads', async () => {
  const list = await request(ctx.baseUrl, '/signups', { token: ownerToken });
  assert.equal(list.status, 200);
  assert.ok(list.data.some((s) => s.id === signupId));

  const update = await request(ctx.baseUrl, `/signups/${signupId}`, {
    method: 'PATCH', token: ownerToken, body: { status: 'contacted' },
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.status, 'contacted');
});
