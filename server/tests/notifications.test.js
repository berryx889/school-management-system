import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

let ctx;
let adminToken;
let teacherToken;
let teacherId;
let teacher2Token;
let teacher2Id;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  const t1 = await request(ctx.baseUrl, '/auth/login', {
    method: 'POST',
    body: { username: 'teacher1', password: 'teacher123', portal: 'staff' },
  });
  teacherToken = t1.data.token;
  teacherId = t1.data.user.id;

  const { data: t2 } = await request(ctx.baseUrl, '/teachers', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'Notif Test Teacher', username: 'notif_test_teacher', password: 'test123' },
  });
  teacher2Id = t2.id;
  teacher2Token = await login(ctx.baseUrl, 'notif_test_teacher', 'test123', 'teacher');
});

after(async () => {
  await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [[teacherId, teacher2Id]]);
  await pool.query('DELETE FROM staff_permissions WHERE user_id=$1', [teacher2Id]);
  await pool.query('DELETE FROM users WHERE id=$1', [teacher2Id]);
  await stopServer(ctx.server);
  await pool.end();
});

test('granting a permission auto-creates a notification for the grantee', async () => {
  const classes = await request(ctx.baseUrl, '/classes', { token: adminToken });
  const classId = classes.data[0].id;
  const subjects = await request(ctx.baseUrl, '/subjects', { token: adminToken });
  const subjectId = subjects.data[0].id;

  const grant = await request(ctx.baseUrl, '/permissions', {
    method: 'POST',
    token: adminToken,
    body: { user_id: teacher2Id, permission_type: 'marks_entry', class_id: classId, subject_id: subjectId },
  });
  assert.equal(grant.status, 201);

  const notifs = await request(ctx.baseUrl, '/notifications', { token: teacher2Token });
  assert.equal(notifs.status, 200);
  const found = notifs.data.find((n) => n.type === 'permission_granted');
  assert.ok(found, 'expected a permission_granted notification');
  assert.ok(found.message.includes('marks entry'), 'message should mention marks entry');
  assert.equal(found.is_read, false);
});

test('admin can push a notification to a specific staff member', async () => {
  const res = await request(ctx.baseUrl, '/notifications', {
    method: 'POST',
    token: adminToken,
    body: { user_id: teacher2Id, title: 'Test alert', message: 'Please check your schedule.' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.sent, 1);
});

test('admin can push a notification to all staff', async () => {
  const res = await request(ctx.baseUrl, '/notifications', {
    method: 'POST',
    token: adminToken,
    body: { title: 'Staff meeting', message: 'Meeting at 3pm today.' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.sent >= 2, 'should send to at least 2 staff');
});

test('unread-count reflects actual unread notifications', async () => {
  const res = await request(ctx.baseUrl, '/notifications/unread-count', { token: teacher2Token });
  assert.equal(res.status, 200);
  assert.ok(res.data.count >= 2, 'teacher2 should have at least 2 unread');
});

test('marking a notification as read decreases unread count', async () => {
  const notifs = await request(ctx.baseUrl, '/notifications', { token: teacher2Token });
  const unreadOne = notifs.data.find((n) => !n.is_read);
  assert.ok(unreadOne);

  const markRes = await request(ctx.baseUrl, `/notifications/${unreadOne.id}/read`, {
    method: 'PUT',
    token: teacher2Token,
  });
  assert.equal(markRes.status, 200);

  const after = await request(ctx.baseUrl, '/notifications/unread-count', { token: teacher2Token });
  assert.ok(after.data.count < notifs.data.filter((n) => !n.is_read).length);
});

test('mark-all-read zeroes the unread count', async () => {
  await request(ctx.baseUrl, '/notifications/mark-all-read', { method: 'PUT', token: teacher2Token });
  const res = await request(ctx.baseUrl, '/notifications/unread-count', { token: teacher2Token });
  assert.equal(res.data.count, 0);
});

test('a user cannot read another users notification', async () => {
  const push = await request(ctx.baseUrl, '/notifications', {
    method: 'POST',
    token: adminToken,
    body: { user_id: teacher2Id, title: 'Private', message: 'Only for teacher2' },
  });
  const notifId = push.data.notifications[0].id;

  const res = await request(ctx.baseUrl, `/notifications/${notifId}/read`, {
    method: 'PUT',
    token: teacherToken,
  });
  assert.equal(res.status, 404);
});

test('non-admin cannot push notifications', async () => {
  const res = await request(ctx.baseUrl, '/notifications', {
    method: 'POST',
    token: teacherToken,
    body: { title: 'Hack', message: 'Should fail' },
  });
  assert.equal(res.status, 403);
});
