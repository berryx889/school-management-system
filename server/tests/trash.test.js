import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// The recycle bin: soft-deleted records show up in /trash and can be restored, admins only.

let ctx;
let adminToken;
let subjectId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  // Soft-delete a real subject via the API so it lands in the trash.
  const subjects = await request(ctx.baseUrl, '/subjects', { token: adminToken });
  subjectId = subjects.data[0]?.id;
  if (subjectId) await request(ctx.baseUrl, `/subjects/${subjectId}`, { method: 'DELETE', token: adminToken });
});

after(async () => {
  if (subjectId) await pool.query('UPDATE subjects SET deleted_at=NULL WHERE id=$1', [subjectId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('a non-admin cannot open the trash', async () => {
  const teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  assert.equal((await request(ctx.baseUrl, '/trash', { token: teacherToken })).status, 403);
});

test('a soft-deleted subject appears in the trash', async () => {
  if (!subjectId) return;
  const r = await request(ctx.baseUrl, '/trash', { token: adminToken });
  assert.equal(r.status, 200);
  assert.ok(r.data.subjects.some((s) => s.id === subjectId), 'deleted subject is listed');
});

test('restoring puts the record back and clears it from trash', async () => {
  if (!subjectId) return;
  const restore = await request(ctx.baseUrl, '/trash/restore', {
    method: 'POST', token: adminToken, body: { type: 'subjects', id: subjectId },
  });
  assert.equal(restore.status, 200);

  // Back in the live list, gone from trash.
  const subjects = await request(ctx.baseUrl, '/subjects', { token: adminToken });
  assert.ok(subjects.data.some((s) => s.id === subjectId), 'restored to the live list');
  const trash = await request(ctx.baseUrl, '/trash', { token: adminToken });
  assert.ok(!trash.data.subjects.some((s) => s.id === subjectId), 'no longer in trash');

  // A second restore of the same row has nothing to do.
  const again = await request(ctx.baseUrl, '/trash/restore', {
    method: 'POST', token: adminToken, body: { type: 'subjects', id: subjectId },
  });
  assert.equal(again.status, 404);
});
