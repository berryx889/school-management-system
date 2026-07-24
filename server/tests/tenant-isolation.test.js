import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { startServer, stopServer, request, login, pool } from './helpers.js';
import { appPool } from '../db/pool.js';

// The core promise of the multi-tenant work: one school can NEVER see another's data — not
// through the API, not by guessing an id, not even via a raw query on the restricted app
// role. We stand up a real second school and prove all three.

let ctx;
let school1AdminToken; // founding school (id 1), seeded 'admin'
let school2AdminToken; // second school, its own 'admin' (same username, different tenant)
let school2Id;
let school2StudentId;

before(async () => {
  ctx = await startServer();
  // Resolve school 1 by the single-tenant fallback BEFORE school 2 exists.
  school1AdminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  // Provision school 2 directly on the admin pool (bypasses RLS; school_id set explicitly).
  const hash = await bcrypt.hash('admin2pass', 10);
  school2Id = (await pool.query(
    "INSERT INTO schools (name, subdomain, code) VALUES ('Test School Two','testtwo','TESTTWO') RETURNING id"
  )).rows[0].id;
  await pool.query(
    "INSERT INTO users (role, username, password_hash, full_name, school_id) VALUES ('admin','admin',$1,'School Two Admin',$2)",
    [hash, school2Id]
  );
  const s2user = (await pool.query(
    "INSERT INTO users (role, username, password_hash, full_name, school_id) VALUES ('student','s2student',$1,'School Two Student',$2) RETURNING id",
    [hash, school2Id]
  )).rows[0].id;
  school2StudentId = (await pool.query(
    "INSERT INTO students (user_id, student_code, qr_token, school_id) VALUES ($1,'S2-0001',$2,$3) RETURNING id",
    [s2user, 'qr-school2-isolation-test', school2Id]
  )).rows[0].id;

  // School 2's admin shares the username 'admin' with school 1 — login now needs the code.
  school2AdminToken = (await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin2pass', portal: 'staff', schoolCode: 'TESTTWO' },
  })).data.token;
});

after(async () => {
  if (school2Id) await pool.query('DELETE FROM schools WHERE id=$1', [school2Id]); // cascades to its users/students
  await stopServer(ctx.server);
  await pool.end();
});

test('login requires the right school code — wrong tenant rejects the credentials', async () => {
  // school 1 admin password against school 2's code must fail (different tenant, no match).
  const wrong = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123', portal: 'staff', schoolCode: 'TESTTWO' },
  });
  assert.equal(wrong.status, 401);
  assert.ok(school2AdminToken, 'school 2 admin logged in with its own code');
});

test('each school admin sees only their own students via the API', async () => {
  const s2 = await request(ctx.baseUrl, '/students', { token: school2AdminToken });
  assert.equal(s2.status, 200);
  assert.equal(s2.data.total, 1);
  assert.ok(s2.data.data.every((s) => s.school_id === school2Id));

  const s1 = await request(ctx.baseUrl, '/students', { token: school1AdminToken });
  assert.equal(s1.status, 200);
  assert.ok(s1.data.data.every((s) => s.school_id === 1));
  assert.ok(!s1.data.data.some((s) => s.id === school2StudentId), 'school 1 never sees school 2 student');
});

test('school 1 admin cannot fetch a school 2 student by direct id (RLS → 404)', async () => {
  const r = await request(ctx.baseUrl, `/students/${school2StudentId}`, { token: school1AdminToken });
  assert.equal(r.status, 404);
});

test('a student created by school 2 admin is auto-stamped to school 2', async () => {
  const created = await request(ctx.baseUrl, '/students', {
    method: 'POST',
    token: school2AdminToken,
    body: { full_name: 'Fresh S2 Student', parent_phone: '233555000222' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.school_id, school2Id, 'insert defaulted to the caller tenant');
});

test('RLS blocks cross-tenant access on the raw app role — not just in app code', async () => {
  const c = await appPool.connect();
  try {
    // Scoped to school 1, the school-2 student row simply does not exist.
    await c.query("SELECT set_config('app.school_id','1',false)");
    const hidden = await c.query('SELECT id FROM students WHERE id=$1', [school2StudentId]);
    assert.equal(hidden.rows.length, 0);

    // And WITH CHECK forbids writing a row into another tenant.
    await assert.rejects(
      c.query("INSERT INTO students (user_id, student_code, qr_token, school_id) VALUES (1,'X','x',$1)", [school2Id]),
      /row-level security|new row violates/i
    );
  } finally {
    c.release();
  }
});
