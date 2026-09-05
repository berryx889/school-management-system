import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSms } from '../services/sms.js';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, paystackConfigured } from '../services/paystack.js';
import { auditFromReq } from '../utils/audit.js';
import { getInvoiceBalance } from '../utils/finance.js';
import { canViewStudent } from '../utils/access.js';

const router = Router();

function generateReceiptNo() {
  return 'RCT' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

async function recordSuccessfulPayment({ invoiceId, amount, method, paystackRef, recordedBy }) {
  const receipt_no = generateReceiptNo();
  const { rows } = await pool.query(
    `INSERT INTO payments (invoice_id, amount, method, paystack_ref, status, recorded_by, receipt_no)
     VALUES ($1,$2,$3,$4,'success',$5,$6)
     ON CONFLICT (paystack_ref) DO NOTHING
     RETURNING *`,
    [invoiceId, amount, method, paystackRef || null, recordedBy || null, receipt_no]
  );
  if (!rows.length) return null; // already recorded (idempotency)

  const invoice = await pool.query(
    `SELECT i.student_id, u.full_name AS student_name, p.phone AS parent_phone
     FROM fee_invoices i JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id LEFT JOIN users p ON p.id = s.parent_id
     WHERE i.id=$1`,
    [invoiceId]
  );
  const info = invoice.rows[0];
  if (info?.parent_phone) {
    await sendSms(
      info.parent_phone,
      `Payment received: GHS ${Number(amount).toFixed(2)} for ${info.student_name}. Receipt ${receipt_no}. Thank you.`
    );
  }
  return rows[0];
}

router.get('/', requireAuth, async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });

  if (!(await canViewStudent(req.user, student_id, { accountant: true, teacher: false }))) return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await pool.query(
    `SELECT p.* FROM payments p
     JOIN fee_invoices i ON i.id = p.invoice_id
     WHERE i.student_id=$1 AND p.status='success'
     ORDER BY p.paid_at DESC`,
    [student_id]
  );
  res.json(rows);
});

// Record a cash/manual payment taken at the office.
router.post('/manual', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { invoice_id, amount, method } = req.body;
  if (!invoice_id || !amount || !method) {
    return res.status(400).json({ error: 'invoice_id, amount, method are required' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be greater than zero' });
  }
  const client = await pool.connect();
  let payment;
  let after;
  try {
    await client.query('BEGIN');
    const invoiceResult = await client.query('SELECT * FROM fee_invoices WHERE id=$1 FOR UPDATE', [invoice_id]);
    if (!invoiceResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const settingsResult = await client.query('SELECT * FROM school_settings LIMIT 1');
    const before = await getInvoiceBalance(invoiceResult.rows[0], settingsResult.rows[0] || {});
    if (numericAmount > before.balance + 0.001) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Payment exceeds the outstanding balance of GHS ${before.balance.toFixed(2)}` });
    }
    payment = await recordSuccessfulPayment({ invoiceId: invoice_id, amount: numericAmount, method, recordedBy: req.user.id });
    after = await getInvoiceBalance(invoiceResult.rows[0], settingsResult.rows[0] || {});
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  await auditFromReq(req, {
    action: 'payment.record',
    entityType: 'payment',
    entityId: payment.id,
    summary: `Recorded ${method} payment of ${amount} on invoice #${invoice_id}`,
    metadata: { invoice_id, amount, method },
  });
  res.status(201).json({ ...payment, invoice_balance: after.balance, paid_total: after.paid });
});

router.post('/initiate', requireAuth, requireRole('parent'), async (req, res) => {
  const { invoice_id, amount } = req.body;
  if (!invoice_id || !amount) return res.status(400).json({ error: 'invoice_id and amount are required' });
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'amount must be greater than zero' });

  const invoice = await pool.query(
    `SELECT i.*, s.parent_id FROM fee_invoices i JOIN students s ON s.id = i.student_id WHERE i.id=$1`,
    [invoice_id]
  );
  if (!invoice.rows.length) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.rows[0].parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const settings = await pool.query('SELECT * FROM school_settings LIMIT 1');
  const balance = await getInvoiceBalance(invoice.rows[0], settings.rows[0] || {});
  if (numericAmount > balance.balance + 0.001) {
    return res.status(400).json({ error: `Payment exceeds the outstanding balance of GHS ${balance.balance.toFixed(2)}` });
  }

  if (!paystackConfigured()) {
    return res.status(503).json({ error: 'Online payments are not configured yet. Please pay at the office.', configured: false });
  }

  const reference = 'SMS' + crypto.randomBytes(8).toString('hex');
  const result = await initializeTransaction({
    email: `${req.user.username}@parents.school`,
    amountPesewas: Math.round(numericAmount * 100),
    reference,
    metadata: { invoice_id, student_id: invoice.rows[0].student_id },
  });

  if (!result.status) return res.status(502).json({ error: 'Could not start payment', details: result });

  await pool.query(
    `INSERT INTO payments (invoice_id, amount, method, paystack_ref, status)
     VALUES ($1,$2,'card',$3,'pending')`,
    [invoice_id, numericAmount, reference]
  );

  res.json({ authorization_url: result.data.authorization_url, reference });
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }
  const event = JSON.parse(req.body.toString('utf8'));

  if (event.event === 'charge.success') {
    const { reference, amount, metadata } = event.data;
    try {
      await recordPaystackSuccess(reference, amount, metadata);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }
  res.sendStatus(200);
});

async function recordPaystackSuccess(reference, amountPesewas, metadata) {
  const existing = await pool.query('SELECT * FROM payments WHERE paystack_ref=$1', [reference]);
  if (!existing.rows.length) {
    const err = new Error('No pending payment exists for this reference');
    err.status = 404;
    throw err;
  }
  const pending = existing.rows[0];
  if (pending.status === 'success') return pending;
  if (metadata?.invoice_id != null && Number(metadata.invoice_id) !== pending.invoice_id) {
    const err = new Error('Payment invoice metadata does not match the stored transaction');
    err.status = 400;
    throw err;
  }
  const paidAmount = Number(amountPesewas) / 100;
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - Number(pending.amount)) > 0.001) {
    const err = new Error('Payment amount does not match the initiated transaction');
    err.status = 400;
    throw err;
  }
  const receiptNo = pending.receipt_no || generateReceiptNo();
  await pool.query(
    `UPDATE payments SET status='success', amount=$1, receipt_no=$2, paid_at=now()
     WHERE id=$3`,
    [paidAmount, receiptNo, pending.id]
  );

  const invoice = await pool.query(
    `SELECT i.student_id, u.full_name AS student_name, p.phone AS parent_phone
     FROM fee_invoices i JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id LEFT JOIN users p ON p.id = s.parent_id
     WHERE i.id=$1`,
    [pending.invoice_id]
  );
  const info = invoice.rows[0];
  if (info?.parent_phone) {
    await sendSms(
      info.parent_phone,
      `Payment received: GHS ${paidAmount.toFixed(2)} for ${info.student_name}. Receipt ${receiptNo}. Thank you.`
    );
  }
  return { ...pending, status: 'success', amount: paidAmount, receipt_no: receiptNo };
}

router.get('/verify/:reference', requireAuth, requireRole('parent'), async (req, res) => {
  const owned = await pool.query(
    `SELECT p.id FROM payments p
     JOIN fee_invoices i ON i.id=p.invoice_id
     JOIN students s ON s.id=i.student_id
     WHERE p.paystack_ref=$1 AND s.parent_id=$2`,
    [req.params.reference, req.user.id]
  );
  if (!owned.rows.length) return res.status(404).json({ error: 'Payment reference not found' });
  const result = await verifyTransaction(req.params.reference);
  if (result.configured === false) return res.status(503).json({ error: 'Payments not configured' });
  if (result.data?.status === 'success') {
    await recordPaystackSuccess(req.params.reference, result.data.amount, result.data.metadata);
  }
  res.json(result);
});

export default router;
