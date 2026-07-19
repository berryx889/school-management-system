import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// PRD rule (5.4): QR attendance always wins. A manual mark can only fill in an
// absent where no record exists yet — it must never downgrade a QR present/late
// into absent. Also: a duplicate scan for the same student/day must not create
// a second row and must be reported back as a duplicate.

let ctx;
let studentId;
let qrToken;
let userIds = [];

before(async () => {
  ctx = await startServer();
  const adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  ctx.adminToken = adminToken;

  const { status, data: student } = await request(ctx.baseUrl, '/students', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'Test Precedence Student', class_id: 4, parent_phone: '0244999001' },
  });
  assert.equal(status, 201, 'fixture: student creation should succeed');
  studentId = student.id;
  userIds.push(student.user_id);

  const { data: card } = await request(ctx.baseUrl, `/students/${studentId}/qr-card`, { token: adminToken });
  qrToken = card.qr_token;

  // Clean slate: remove any attendance row that might already exist for today.
  await pool.query('DELETE FROM attendance WHERE student_id=$1', [studentId]);
});

after(async () => {
  await pool.query('DELETE FROM attendance WHERE student_id=$1', [studentId]);
  await pool.query('DELETE FROM students WHERE id=$1', [studentId]);
  if (userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
  // The auto-created parent for this student's phone number.
  await pool.query("DELETE FROM users WHERE phone='233244999001' AND role='parent'");
  await stopServer(ctx.server);
  await pool.end();
});

test('QR scan records attendance and a second scan the same day is reported as duplicate, not a new row', async () => {
  const first = await request(ctx.baseUrl, '/attendance/scan', {
    method: 'POST',
    token: ctx.adminToken,
    body: { qr_token: qrToken },
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.duplicate, false);
  assert.equal(first.data.attendance.method, 'qr');
  assert.ok(['present', 'late'].includes(first.data.attendance.status));

  const second = await request(ctx.baseUrl, '/attendance/scan', {
    method: 'POST',
    token: ctx.adminToken,
    body: { qr_token: qrToken },
  });
  assert.equal(second.status, 200);
  assert.equal(second.data.duplicate, true);

  const { rows } = await pool.query('SELECT * FROM attendance WHERE student_id=$1', [studentId]);
  assert.equal(rows.length, 1, 'no duplicate row should be created for the same student/date');
});

test('a manual absent mark does not downgrade an existing QR-recorded attendance', async () => {
  const today = new Date().toISOString().slice(0, 10);

  const manual = await request(ctx.baseUrl, '/attendance/manual', {
    method: 'POST',
    token: ctx.adminToken,
    body: { class_id: 4, date: today, records: [{ student_id: studentId, status: 'absent' }] },
  });
  assert.equal(manual.status, 200);

  const returnedRecord = manual.data.find((r) => r.student_id === studentId);
  assert.equal(returnedRecord.method, 'qr', 'the QR record should be returned untouched, not overwritten');
  assert.notEqual(returnedRecord.status, 'absent');

  const { rows } = await pool.query('SELECT * FROM attendance WHERE student_id=$1', [studentId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].method, 'qr');
  assert.notEqual(rows[0].status, 'absent');
});

test('manual marking fills in a student with no existing record for the day', async () => {
  const { status: s2, data: student2 } = await request(ctx.baseUrl, '/students', {
    method: 'POST',
    token: ctx.adminToken,
    body: { full_name: 'Test Precedence Student Two', class_id: 4, parent_phone: '0244999002' },
  });
  assert.equal(s2, 201);
  userIds.push(student2.user_id);

  const today = new Date().toISOString().slice(0, 10);
  const manual = await request(ctx.baseUrl, '/attendance/manual', {
    method: 'POST',
    token: ctx.adminToken,
    body: { class_id: 4, date: today, records: [{ student_id: student2.id, status: 'absent' }] },
  });
  assert.equal(manual.status, 200);
  const record = manual.data.find((r) => r.student_id === student2.id);
  assert.equal(record.method, 'manual');
  assert.equal(record.status, 'absent');

  await pool.query('DELETE FROM attendance WHERE student_id=$1', [student2.id]);
  await pool.query('DELETE FROM students WHERE id=$1', [student2.id]);
  await pool.query("DELETE FROM users WHERE phone='233244999002' AND role='parent'");
});
