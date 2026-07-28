import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { generate as generateTotp } from 'otplib';
import { startServer, stopServer, request, pool } from './helpers.js';

// Opt-in TOTP two-factor auth. Uses a throwaway user (never the seeded admin) so a stuck 2FA
// state can never lock anyone real out even if cleanup fails.

let ctx;
let token;
let secret;
const USER = 'twofa_user';
const PASS = 'twofa-pass-1';

async function code() { return generateTotp({ secret }); }
async function loginBody(extra = {}) {
  return { username: USER, password: PASS, portal: 'staff', schoolCode: 'BFBS', ...extra };
}

before(async () => {
  ctx = await startServer();
  const hash = await bcrypt.hash(PASS, 10);
  await pool.query(
    "INSERT INTO users (role, username, password_hash, full_name, school_id) VALUES ('admin',$1,$2,'2FA Tester',1) ON CONFLICT DO NOTHING",
    [USER, hash]
  );
  token = (await request(ctx.baseUrl, '/auth/login', { method: 'POST', body: await loginBody() })).data.token;
});

after(async () => {
  await pool.query('DELETE FROM users WHERE username=$1 AND school_id=1', [USER]);
  await stopServer(ctx.server);
  await pool.end();
});

test('setup returns a secret + QR, and a valid code enables 2FA', async () => {
  const setup = await request(ctx.baseUrl, '/account/2fa/setup', { method: 'POST', token });
  assert.equal(setup.status, 200);
  assert.ok(setup.data.secret && setup.data.qr.startsWith('data:image/png'));
  secret = setup.data.secret;

  const bad = await request(ctx.baseUrl, '/account/2fa/enable', { method: 'POST', token, body: { code: '000000' } });
  assert.equal(bad.status, 401);

  const good = await request(ctx.baseUrl, '/account/2fa/enable', { method: 'POST', token, body: { code: await code() } });
  assert.equal(good.status, 200);
});

test('once enabled, login demands a code', async () => {
  const noCode = await request(ctx.baseUrl, '/auth/login', { method: 'POST', body: await loginBody() });
  assert.equal(noCode.status, 200);
  assert.equal(noCode.data.requires_2fa, true);
  assert.ok(!noCode.data.token, 'no token issued without the second factor');

  const wrong = await request(ctx.baseUrl, '/auth/login', { method: 'POST', body: await loginBody({ totp_code: '123456' }) });
  assert.equal(wrong.status, 401);

  const ok = await request(ctx.baseUrl, '/auth/login', { method: 'POST', body: await loginBody({ totp_code: await code() }) });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token, 'issues a token with a valid code');
});

test('disabling 2FA restores single-factor login', async () => {
  const off = await request(ctx.baseUrl, '/account/2fa/disable', { method: 'POST', token, body: { code: await code() } });
  assert.equal(off.status, 200);

  const login = await request(ctx.baseUrl, '/auth/login', { method: 'POST', body: await loginBody() });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
  assert.ok(!login.data.requires_2fa);
});
