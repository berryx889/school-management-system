import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// Tax rate, discounts, and late fees. Uses its own dedicated class + student (rather than
// the shared JHS 2 fixture other test files use) since /invoices/generate sums ALL fee
// structures for a class/term — sharing a class with concurrently-running test files would
// let their fee structures bleed into this test's totals.

let ctx;
let adminToken;
let termId;
let classId;
let studentId;
let structureId;
let invoiceId;
let studentUserId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;

  const { data: cls } = await request(ctx.baseUrl, '/classes', {
    method: 'POST', token: adminToken, body: { name: 'Finance Test Class', level: 'Test' },
  });
  classId = cls.id;

  const { data: student } = await request(ctx.baseUrl, '/students', {
    method: 'POST', token: adminToken, body: { full_name: 'Finance Test Student', class_id: classId, parent_phone: '0244999003' },
  });
  studentId = student.id;
  studentUserId = student.user_id;
});

after(async () => {
  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { tax_rate: 0, late_fee_grace_days: 0, late_fee_percent: 0 } });
  if (invoiceId) await pool.query('DELETE FROM payments WHERE invoice_id=$1', [invoiceId]);
  await pool.query('DELETE FROM fee_invoices WHERE student_id=$1', [studentId]);
  if (structureId) await pool.query('DELETE FROM fee_structures WHERE id=$1', [structureId]);
  await pool.query('DELETE FROM students WHERE id=$1', [studentId]);
  await pool.query('DELETE FROM users WHERE id=$1', [studentUserId]);
  await pool.query("DELETE FROM users WHERE phone='233244999003' AND role='parent'");
  await pool.query('DELETE FROM classes WHERE id=$1', [classId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('tax_rate is applied when invoices are generated', async () => {
  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { tax_rate: 10 } });

  const structure = await request(ctx.baseUrl, '/fees/structures', {
    method: 'POST', token: adminToken, body: { term_id: termId, class_id: classId, item_name: 'Tax test fee', amount: 100 },
  });
  structureId = structure.data.id;

  const generate = await request(ctx.baseUrl, '/fees/invoices/generate', {
    method: 'POST', token: adminToken, body: { term_id: termId, class_id: classId },
  });
  assert.equal(generate.status, 200);
  assert.equal(generate.data.created, 1);

  const invRes = await request(ctx.baseUrl, `/fees/invoices?student_id=${studentId}`, { token: adminToken });
  invoiceId = invRes.data.invoices[0].id;
  assert.equal(Number(invRes.data.invoices[0].total_due), 110, '100 + 10% tax should be 110');

  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { tax_rate: 0 } });
});

test('applying a discount reduces the debtor balance', async () => {
  const patch = await request(ctx.baseUrl, `/fees/invoices/${invoiceId}/discount`, {
    method: 'PATCH', token: adminToken, body: { discount: 10 },
  });
  assert.equal(patch.status, 200);
  assert.equal(Number(patch.data.balance), 100, '110 total - 10 discount = 100 balance');

  const debtors = await request(ctx.baseUrl, '/fees/debtors', { token: adminToken, method: 'GET' });
  const row = debtors.data.find((d) => d.invoice_id === invoiceId);
  assert.ok(row, 'invoice should still appear as a debtor');
  assert.equal(Number(row.balance), 100);
  assert.equal(Number(row.discount), 10);
});

test('a backdated due date past the grace period adds a late fee; within grace does not', async () => {
  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 10);
  await pool.query('UPDATE fee_invoices SET due_date=$1 WHERE id=$2', [pastDue.toISOString().slice(0, 10), invoiceId]);

  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { late_fee_grace_days: 3, late_fee_percent: 10 } });
  const overdue = await request(ctx.baseUrl, '/fees/debtors', { token: adminToken, method: 'GET' });
  const overdueRow = overdue.data.find((d) => d.invoice_id === invoiceId);
  assert.ok(overdueRow.late_fee > 0, 'a due date 10 days past a 3-day grace period should incur a late fee');
  assert.equal(Number(overdueRow.late_fee), 10, '10% of the 100 outstanding balance');

  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { late_fee_grace_days: 30 } });
  const withinGrace = await request(ctx.baseUrl, '/fees/debtors', { token: adminToken, method: 'GET' });
  const withinGraceRow = withinGrace.data.find((d) => d.invoice_id === invoiceId);
  assert.equal(Number(withinGraceRow.late_fee), 0, 'a due date within a 30-day grace period should not incur a late fee yet');

  await request(ctx.baseUrl, '/settings', { method: 'PUT', token: adminToken, body: { late_fee_grace_days: 0, late_fee_percent: 0 } });
});
