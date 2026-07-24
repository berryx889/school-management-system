import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Public interest-signup queue: anyone can submit; only the platform owner can view/triage
// (users.is_platform_owner — see migration 013). The seeded admin is the platform owner, so
// the list/triage assertions below still pass. Cross-admin lockout lives in
// platform-owner.test.js.

let ctx;
let adminToken;
let teacherToken;
let signupId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
});

after(async () => {
  if (signupId) await pool.query('DELETE FROM school_signups WHERE id=$1', [signupId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('public visitor can submit a signup without auth', async () => {
  const res = await request(ctx.baseUrl, '/signups', {
    method: 'POST',
    body: { school_name: 'Test Academy', contact_name: 'Jane Doe', contact_email: 'jane@testacademy.com', contact_phone: '0244000111' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.status, 'new');
  signupId = res.data.id;
});

test('submission validates required fields and email format', async () => {
  const missing = await request(ctx.baseUrl, '/signups', { method: 'POST', body: { school_name: 'X' } });
  assert.equal(missing.status, 400);

  const badEmail = await request(ctx.baseUrl, '/signups', {
    method: 'POST',
    body: { school_name: 'X', contact_name: 'Y', contact_email: 'not-an-email' },
  });
  assert.equal(badEmail.status, 400);
});

test('unauthenticated requests to list/update are rejected', async () => {
  const list = await request(ctx.baseUrl, '/signups');
  assert.equal(list.status, 401);

  const update = await request(ctx.baseUrl, `/signups/${signupId}`, { method: 'PATCH', body: { status: 'contacted' } });
  assert.equal(update.status, 401);
});

test('non-admin is rejected from list/update', async () => {
  const list = await request(ctx.baseUrl, '/signups', { token: teacherToken });
  assert.equal(list.status, 403);

  const update = await request(ctx.baseUrl, `/signups/${signupId}`, { method: 'PATCH', token: teacherToken, body: { status: 'contacted' } });
  assert.equal(update.status, 403);
});

test('admin can list signups (optionally filtered by status) and update status', async () => {
  const list = await request(ctx.baseUrl, '/signups', { token: adminToken });
  assert.equal(list.status, 200);
  assert.ok(list.data.some((s) => s.id === signupId));

  const filtered = await request(ctx.baseUrl, '/signups?status=new', { token: adminToken });
  assert.equal(filtered.status, 200);
  assert.ok(filtered.data.every((s) => s.status === 'new'));

  const update = await request(ctx.baseUrl, `/signups/${signupId}`, {
    method: 'PATCH', token: adminToken, body: { status: 'contacted' },
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.status, 'contacted');
});
