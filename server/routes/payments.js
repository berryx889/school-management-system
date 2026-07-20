import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSms } from '../services/sms.js';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, paystackConfigured } from '../services/paystack.js';

const router = Router();

function generateReceiptNo() {
  return 'RCT' + Date.now().toString(36).toUpperCase();
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

  if (req.user.role === 'parent') {
    const owner = await pool.query('SELECT parent_id FROM students WHERE id=$1', [student_id]);
    if (owner.rows[0]?.parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  }

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
  const payment = await recordSuccessfulPayment({
    invoiceId: invoice_id,
    amount,
    method,
    recordedBy: req.user.id,
  });
  res.status(201).json(payment);
});

router.post('/initiate', requireAuth, requireRole('parent'), async (req, res) => {
  const { invoice_id, amount } = req.body;
  if (!invoice_id || !amount) return res.status(400).json({ error: 'invoice_id and amount are required' });

  const invoice = await pool.query(
    `SELECT i.*, s.parent_id FROM fee_invoices i JOIN students s ON s.id = i.student_id WHERE i.id=$1`,
    [invoice_id]
  );
  if (!invoice.rows.length) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.rows[0].parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  if (!paystackConfigured()) {
    return res.status(503).json({ error: 'Online payments are not configured yet. Please pay at the office.', configured: false });
  }

  const reference = 'SMS' + crypto.randomBytes(8).toString('hex');
  const result = await initializeTransaction({
    email: `${req.user.username}@parents.school`,
    amountPesewas: Math.round(Number(amount) * 100),
    reference,
    metadata: { invoice_id, student_id: invoice.rows[0].student_id },
  });

  if (!result.status) return res.status(502).json({ error: 'Could not start payment', details: result });

  await pool.query(
    `INSERT INTO payments (invoice_id, amount, method, paystack_ref, status)
     VALUES ($1,$2,'card',$3,'pending')`,
    [invoice_id, amount, reference]
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
    await recordPaystackSuccess(reference, amount, metadata);
  }
  res.sendStatus(200);
});

async function recordPaystackSuccess(reference, amountPesewas, metadata) {
  const existing = await pool.query('SELECT * FROM payments WHERE paystack_ref=$1', [reference]);
  if (existing.rows.length && existing.rows[0].status === 'success') return; // idempotent

  if (existing.rows.length) {
    await pool.query("UPDATE payments SET status='success' WHERE paystack_ref=$1", [reference]);
  } else {
    await pool.query(
      `INSERT INTO payments (invoice_id, amount, method, paystack_ref, status)
       VALUES ($1,$2,'card',$3,'success')`,
      [metadata.invoice_id, amountPesewas / 100, reference]
    );
  }

  const invoice = await pool.query(
    `SELECT i.student_id, u.full_name AS student_name, p.phone AS parent_phone
     FROM fee_invoices i JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id LEFT JOIN users p ON p.id = s.parent_id
     WHERE i.id=$1`,
    [metadata.invoice_id]
  );
  const info = invoice.rows[0];
  if (info?.parent_phone) {
    await sendSms(
      info.parent_phone,
      `Payment received: GHS ${(amountPesewas / 100).toFixed(2)} for ${info.student_name}. Thank you.`
    );
  }
}

router.get('/verify/:reference', requireAuth, requireRole('parent'), async (req, res) => {
  const result = await verifyTransaction(req.params.reference);
  if (result.configured === false) return res.status(503).json({ error: 'Payments not configured' });
  if (result.data?.status === 'success') {
    await recordPaystackSuccess(req.params.reference, result.data.amount, result.data.metadata);
  }
  res.json(result);
});

export default router;
