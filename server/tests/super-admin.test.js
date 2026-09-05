import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let superToken;
let adminToken;
let ordinaryAdminId;

before(async () => {
  const passwordHash = await bcrypt.hash('adminpass123', 10);
  const created = await pool.query(
    `INSERT INTO users (role, username, password_hash, full_name, school_id)
     VALUES ('admin','ordinary_admin_test',$1,'Ordinary Admin Test',1) RETURNING id`,
    [passwordHash]
  );
  ordinaryAdminId = created.rows[0].id;
  ctx = await startServer();
  superToken = await login(ctx.baseUrl, 'admin', 'admin123', 'super_admin');
  adminToken = await login(ctx.baseUrl, 'ordinary_admin_test', 'adminpass123', 'admin');
});

after(async () => {
  if (ordinaryAdminId) await pool.query('DELETE FROM users WHERE id=$1', [ordinaryAdminId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('founding admin signs in as super_admin and can open both dashboards', async () => {
  const command = await request(ctx.baseUrl, '/dashboard/super-admin', { token: superToken });
  assert.equal(command.status, 200);
  assert.equal(typeof command.data.total_staff, 'number');

  const inherited = await request(ctx.baseUrl, '/dashboard/admin', { token: superToken });
  assert.equal(inherited.status, 200);
});

test('ordinary admin cannot access the Super Admin dashboard', async () => {
  const res = await request(ctx.baseUrl, '/dashboard/super-admin', { token: adminToken });
  assert.equal(res.status, 403);
});

test('ordinary admin cannot create a Super Admin account', async () => {
  const res = await request(ctx.baseUrl, '/staff', {
    method: 'POST', token: adminToken,
    body: { role: 'super_admin', full_name: 'Forbidden Super', username: 'forbidden_super_test', password: 'pass1234' },
  });
  assert.equal(res.status, 403);
});

test('ordinary admin cannot reset a Super Admin password', async () => {
  const { rows } = await pool.query("SELECT id FROM users WHERE role='super_admin' AND school_id=1 LIMIT 1");
  const res = await request(ctx.baseUrl, `/account/reset-password/${rows[0].id}`, {
    method: 'POST', token: adminToken,
  });
  assert.equal(res.status, 403);
});
