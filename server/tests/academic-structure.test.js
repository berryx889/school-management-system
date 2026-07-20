import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// POST /classes/bulk-generate should create one class per level x section pair, skip
// name collisions with existing classes, and be admin-only.

let ctx;
let adminToken;
let teacherToken;
let stageId;
let createdClassIds = [];

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
});

after(async () => {
  if (createdClassIds.length) await pool.query('DELETE FROM classes WHERE id = ANY($1::int[])', [createdClassIds]);
  if (stageId) await pool.query('DELETE FROM academic_stages WHERE id=$1', [stageId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('generates one class per level x section pair and reports the created stage', async () => {
  const res = await request(ctx.baseUrl, '/classes/bulk-generate', {
    method: 'POST',
    token: adminToken,
    body: {
      stage_name: 'Structure Test Stage',
      levels: [1, 2],
      sections: ['A', 'B'],
      naming_format: '{stage} {level}{section}',
      capacity_per_class: 30,
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.created.length, 4);
  assert.equal(res.data.skipped.length, 0);
  stageId = res.data.stage.id;
  createdClassIds = res.data.created.map((c) => c.id);

  const names = res.data.created.map((c) => c.name).sort();
  assert.deepEqual(names, [
    'Structure Test Stage 1A', 'Structure Test Stage 1B',
    'Structure Test Stage 2A', 'Structure Test Stage 2B',
  ]);
  assert.ok(res.data.created.every((c) => c.stage_id === stageId));
  assert.ok(res.data.created.every((c) => c.capacity === 30));
});

test('re-running with an overlapping level/section skips the existing name and creates no duplicate', async () => {
  const res = await request(ctx.baseUrl, '/classes/bulk-generate', {
    method: 'POST',
    token: adminToken,
    body: {
      stage_name: 'Structure Test Stage',
      levels: [1, 3],
      sections: ['A'],
      naming_format: '{stage} {level}{section}',
    },
  });
  assert.equal(res.status, 201);
  assert.deepEqual(res.data.skipped, ['Structure Test Stage 1A']);
  assert.equal(res.data.created.length, 1);
  assert.equal(res.data.created[0].name, 'Structure Test Stage 3A');
  createdClassIds.push(res.data.created[0].id);

  const { rows } = await pool.query("SELECT COUNT(*) FROM classes WHERE name='Structure Test Stage 1A'");
  assert.equal(Number(rows[0].count), 1, 'no duplicate row should exist for the skipped name');
});

test('non-admin roles are rejected', async () => {
  const res = await request(ctx.baseUrl, '/classes/bulk-generate', {
    method: 'POST',
    token: teacherToken,
    body: { stage_name: 'Nope', levels: [1], sections: ['A'] },
  });
  assert.equal(res.status, 403);
});
