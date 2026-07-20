import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, request, login, pool } from './helpers.js';

// The accountant role should have finance-scoped access (fee structures, invoices,
// debtors, manual payments) but not admin-only academic/settings capabilities.

let ctx;
let accountantToken;
let adminToken;
let termId;
let structureId;
let invoiceId;

before(async () => {
  ctx = await startServer();
  adminToken = await login(ctx.baseUrl, 'admin', 'admin123', 'admin');
  accountantToken = await login(ctx.baseUrl, 'accountant', 'accountant123', 'accountant');

  const { data: terms } = await request(ctx.baseUrl, '/terms', { token: adminToken });
  termId = terms.find((t) => t.is_current).id;
});

after(async () => {
  if (invoiceId) await pool.query('DELETE FROM payments WHERE invoice_id=$1', [invoiceId]);
  if (invoiceId) await pool.query('DELETE FROM fee_invoices WHERE id=$1', [invoiceId]);
  if (structureId) await pool.query('DELETE FROM fee_structures WHERE id=$1', [structureId]);
  await stopServer(ctx.server);
  await pool.end();
});

test('accountant can create a fee structure, generate invoices, and record a manual payment', async () => {
  const create = await request(ctx.baseUrl, '/fees/structures', {
    method: 'POST',
    token: accountantToken,
    body: { term_id: termId, class_id: 4, item_name: 'Accountant test fee', amount: 100 },
  });
  assert.equal(create.status, 201);
  structureId = create.data.id;

  const generate = await request(ctx.baseUrl, '/fees/invoices/generate', {
    method: 'POST',
    token: accountantToken,
    body: { term_id: termId, class_id: 4 },
  });
  assert.equal(generate.status, 200);

  const debtors = await request(ctx.baseUrl, '/fees/debtors', {
    method: 'GET',
    token: accountantToken,
  });
  assert.equal(debtors.status, 200);
  const debtor = debtors.data.find((d) => d.class_name === 'JHS 2');
  assert.ok(debtor, 'fixture: expected at least one JHS 2 debtor after invoice generation');
  invoiceId = debtor.invoice_id;

  const pay = await request(ctx.baseUrl, '/payments/manual', {
    method: 'POST',
    token: accountantToken,
    body: { invoice_id: invoiceId, amount: 10, method: 'cash' },
  });
  assert.equal(pay.status, 201);
});

test('accountant is rejected from admin-only academic/settings routes', async () => {
  const settings = await request(ctx.baseUrl, '/settings', {
    method: 'PUT',
    token: accountantToken,
    body: { motto: 'should not be allowed' },
  });
  assert.equal(settings.status, 403);

  const promote = await request(ctx.baseUrl, '/students/promote', {
    method: 'POST',
    token: accountantToken,
    body: { student_ids: [1], class_id: 4 },
  });
  assert.equal(promote.status, 403);
});
