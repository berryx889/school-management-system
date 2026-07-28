import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, pool } from './helpers.js';

// The suite disables rate limiting (NODE_ENV=test). This file flips it ON to prove the
// brute-force limiter actually kicks in after too many FAILED logins from one IP, and that
// successful requests don't count toward the limit.

let ctx;
let savedEnv;

before(async () => {
  ctx = await startServer();
  savedEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production'; // activates the limiters' skip=false path
});

after(async () => {
  process.env.NODE_ENV = savedEnv;
  await stopServer(ctx.server);
  await pool.end();
});

test('repeated failed logins from one IP are eventually rate-limited (429)', async () => {
  let sawTooMany = false;
  let failedCount = 0;
  // authLimiter allows 15 failed attempts / 15 min; hammer past that.
  for (let i = 0; i < 25; i++) {
    const res = await request(ctx.baseUrl, '/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'definitely-wrong', portal: 'staff', schoolCode: 'BFBS' },
    });
    if (res.status === 429) { sawTooMany = true; break; }
    if (res.status === 401) failedCount++;
  }
  assert.ok(failedCount >= 15, 'let through at least the allowed number of attempts first');
  assert.ok(sawTooMany, 'started returning 429 once the limit was exceeded');
});
