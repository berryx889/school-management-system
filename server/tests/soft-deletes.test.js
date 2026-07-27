import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Deleting a class / subject / assessment must never destroy the records underneath it
// (marks especially). These now soft-delete: the row is hidden from lists but preserved, and
// its dependent rows are untouched — where a hard DELETE used to CASCADE them away.

let ctx;
let adminToken;
let deletedClassId;
let deletedAssessmentId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
});

after(async () => {
  // Undelete whatever the tests removed so the seeded fixture is intact for reruns.
  if (deletedClassId) await pool.query('UPDATE classes SET deleted_at=NULL WHERE id=$1', [deletedClassId]);
  if (deletedAssessmentId) await pool.query('UPDATE assessments SET deleted_at=NULL WHERE id=$1', [deletedAssessmentId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('deleting a class hides it from the list but keeps the row', async () => {
  const before = await request(ctx.baseUrl, '/classes', { token: adminToken });
  const target = before.data[0];
  assert.ok(target, 'a seeded class exists');
  deletedClassId = target.id;

  assert.equal((await request(ctx.baseUrl, `/classes/${target.id}`, { method: 'DELETE', token: adminToken })).status, 204);

  const after = await request(ctx.baseUrl, '/classes', { token: adminToken });
  assert.ok(!after.data.some((c) => c.id === target.id), 'no longer listed');

  const row = await pool.query('SELECT deleted_at FROM classes WHERE id=$1', [target.id]);
  assert.equal(row.rows.length, 1, 'row still exists');
  assert.ok(row.rows[0].deleted_at, 'stamped deleted_at instead of removed');
});

test('deleting an assessment preserves its marks (no cascade wipe)', async () => {
  // An unlocked assessment in the founding school that actually has marks.
  const fixture = (await pool.query(
    `SELECT m.assessment_id, count(*)::int AS mark_count
       FROM marks m JOIN assessments a ON a.id = m.assessment_id
      WHERE a.school_id = 1 AND a.locked = false AND a.deleted_at IS NULL
      GROUP BY m.assessment_id LIMIT 1`
  )).rows[0];
  if (!fixture) return; // no marked assessment fixture — nothing to prove
  deletedAssessmentId = fixture.assessment_id;

  assert.equal(
    (await request(ctx.baseUrl, `/assessments/${fixture.assessment_id}`, { method: 'DELETE', token: adminToken })).status,
    204
  );

  // The marks are still there — a hard DELETE would have cascaded them away.
  const marksAfter = (await pool.query('SELECT count(*)::int AS n FROM marks WHERE assessment_id=$1', [fixture.assessment_id])).rows[0].n;
  assert.equal(marksAfter, fixture.mark_count, 'marks preserved');

  const assessmentRow = (await pool.query('SELECT deleted_at FROM assessments WHERE id=$1', [fixture.assessment_id])).rows[0];
  assert.ok(assessmentRow.deleted_at, 'assessment soft-deleted, not removed');
});
