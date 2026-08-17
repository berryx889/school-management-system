import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let teacherToken;
let classId;
let termId;

before(async () => {
  ctx = await startServer();
  teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  classId = (await pool.query("SELECT id FROM classes WHERE class_teacher_id=(SELECT id FROM users WHERE username='teacher1') LIMIT 1")).rows[0].id;
  termId = (await pool.query('SELECT id FROM academic_terms WHERE is_current=true LIMIT 1')).rows[0].id;
});

after(async () => {
  await stopServer(ctx.server);
  await pool.end();
});

test('class teacher receives reviewable evidence-based remark drafts', async () => {
  const res = await request(ctx.baseUrl, `/results/remarks/suggestions?class_id=${classId}&term_id=${termId}`, { token: teacherToken });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length > 0);
  assert.equal(typeof res.data[0].suggestion, 'string');
  assert.ok(res.data[0].suggestion.length > 40);
  assert.equal(typeof res.data[0].marks_count, 'number');
});
