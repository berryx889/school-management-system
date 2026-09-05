import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, pool } from './helpers.js';

let ctx;

before(async () => { ctx = await startServer(); });
after(async () => { await stopServer(ctx.server); await pool.end(); });

test('unknown API routes return a readable JSON error and support reference', async () => {
  const response = await fetch(`${ctx.baseUrl}/not-a-real-service`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error_code, 'API_NOT_FOUND');
  assert.ok(body.request_id);
  assert.equal(response.headers.get('x-request-id'), body.request_id);
});

test('API responses include security headers', async () => {
  const response = await fetch(`${ctx.baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
});
