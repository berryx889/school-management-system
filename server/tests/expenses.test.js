import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Expense tracking + income statement (income from payments minus expenses).

let ctx;
let adminToken;
let createdId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
});

after(async () => {
  if (createdId) await pool.query('DELETE FROM expenses WHERE id=$1', [createdId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('recording an expense adds it to the ledger and totals', async () => {
  const created = await request(ctx.baseUrl, '/expenses', {
    method: 'POST', token: adminToken,
    body: { category: 'Electricity', description: 'August bill', amount: 250.5, expense_date: '2026-07-10' },
  });
  assert.equal(created.status, 201);
  assert.equal(Number(created.data.amount), 250.5);
  createdId = created.data.id;

  const list = await request(ctx.baseUrl, '/expenses', { token: adminToken });
  assert.ok(list.data.data.some((e) => e.id === createdId));
  assert.ok(list.data.total_amount >= 250.5);
});

test('income statement reflects income, expenses and net with a category breakdown', async () => {
  const r = await request(ctx.baseUrl, '/expenses/income-statement', { token: adminToken });
  assert.equal(r.status, 200);
  assert.ok(typeof r.data.income === 'number');
  assert.ok(r.data.expenses >= 250.5);
  assert.equal(r.data.net, r.data.income - r.data.expenses);
  assert.ok(r.data.by_category.some((c) => c.category === 'Electricity'));
});

test('a non-finance role cannot touch expenses', async () => {
  const teacherToken = await login(ctx.baseUrl, 'teacher1', 'teacher123', 'teacher');
  assert.equal((await request(ctx.baseUrl, '/expenses', { token: teacherToken })).status, 403);
  assert.equal((await request(ctx.baseUrl, '/expenses', { method: 'POST', token: teacherToken, body: { category: 'X', amount: 1 } })).status, 403);
});

test('deleting an expense removes it from the ledger (soft delete)', async () => {
  assert.equal((await request(ctx.baseUrl, `/expenses/${createdId}`, { method: 'DELETE', token: adminToken })).status, 204);
  const list = await request(ctx.baseUrl, '/expenses', { token: adminToken });
  assert.ok(!list.data.data.some((e) => e.id === createdId));
  const row = await pool.query('SELECT deleted_at FROM expenses WHERE id=$1', [createdId]);
  assert.ok(row.rows[0].deleted_at, 'soft-deleted, not removed');
});
