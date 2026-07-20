import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSms } from '../services/sms.js';
import { getInvoiceBalance } from '../utils/finance.js';

async function getSettings() {
  const { rows } = await pool.query('SELECT * FROM school_settings LIMIT 1');
  return rows[0];
}

const router = Router();

router.get('/structures', requireAuth, async (req, res) => {
  const { class_id, term_id } = req.query;
  const values = [];
  const conditions = [];
  if (class_id) { values.push(class_id); conditions.push(`class_id=$${values.length}`); }
  if (term_id) { values.push(term_id); conditions.push(`term_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM fee_structures ${where} ORDER BY item_name`, values);
  res.json(rows);
});

router.post('/structures', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { term_id, class_id, item_name, amount } = req.body;
  if (!term_id || !class_id || !item_name || amount == null) {
    return res.status(400).json({ error: 'term_id, class_id, item_name, amount are required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO fee_structures (term_id, class_id, item_name, amount) VALUES ($1,$2,$3,$4) RETURNING *',
    [term_id, class_id, item_name, amount]
  );
  res.status(201).json(rows[0]);
});

router.delete('/structures/:id', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  await pool.query('DELETE FROM fee_structures WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

router.post('/invoices/generate', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { term_id, class_id, due_date } = req.body;
  if (!term_id) return res.status(400).json({ error: 'term_id is required' });

  const settings = await getSettings();
  const taxMultiplier = 1 + Number(settings.tax_rate || 0) / 100;

  const structureFilter = class_id ? 'AND class_id=$2' : '';
  const structureValues = class_id ? [term_id, class_id] : [term_id];
  const structures = await pool.query(
    `SELECT * FROM fee_structures WHERE term_id=$1 ${structureFilter}`,
    structureValues
  );
  const totalByClass = new Map();
  for (const s of structures.rows) {
    totalByClass.set(s.class_id, (totalByClass.get(s.class_id) || 0) + Number(s.amount));
  }

  const studentFilter = class_id ? 'AND class_id=$1' : '';
  const studentValues = class_id ? [class_id] : [];
  const students = await pool.query(
    `SELECT id, class_id FROM students WHERE status='active' ${studentFilter}`,
    studentValues
  );

  let created = 0;
  for (const student of students.rows) {
    const total = totalByClass.get(student.class_id);
    if (!total) continue;
    const taxedTotal = Math.round(total * taxMultiplier * 100) / 100;
    const result = await pool.query(
      `INSERT INTO fee_invoices (student_id, term_id, total_due, due_date)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (student_id, term_id) DO UPDATE SET total_due=$3, due_date=COALESCE($4, fee_invoices.due_date)
       RETURNING id`,
      [student.id, term_id, taxedTotal, due_date || null]
    );
    if (result.rows.length) created += 1;
  }
  res.json({ created });
});

router.patch('/invoices/:id/discount', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { discount } = req.body;
  if (discount == null || Number(discount) < 0) return res.status(400).json({ error: 'discount must be a non-negative number' });
  const { rows } = await pool.query('UPDATE fee_invoices SET discount=$1 WHERE id=$2 RETURNING *', [discount, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const settings = await getSettings();
  res.json({ ...rows[0], ...(await getInvoiceBalance(rows[0], settings)) });
});

async function withBalance(invoiceRows) {
  const settings = await getSettings();
  const results = [];
  for (const inv of invoiceRows) {
    results.push({ ...inv, ...(await getInvoiceBalance(inv, settings)) });
  }
  return results;
}

router.get('/invoices', requireAuth, async (req, res) => {
  const { student_id, term_id } = req.query;
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });

  if (req.user.role === 'parent') {
    const owner = await pool.query('SELECT parent_id FROM students WHERE id=$1', [student_id]);
    if (owner.rows[0]?.parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  }

  const values = [student_id];
  let where = 'WHERE student_id=$1';
  if (term_id) { values.push(term_id); where += ` AND term_id=$${values.length}`; }
  const invoices = await pool.query(`SELECT * FROM fee_invoices ${where} ORDER BY generated_at DESC`, values);
  const items = await pool.query(
    `SELECT fs.* FROM fee_structures fs
     JOIN fee_invoices fi ON fi.term_id = fs.term_id
     WHERE fi.student_id=$1 ${term_id ? 'AND fs.term_id=$2' : ''}`,
    values
  );
  res.json({ invoices: await withBalance(invoices.rows), items: items.rows });
});

router.get('/debtors', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { class_id, term_id } = req.query;
  const values = [];
  const conditions = [];
  if (class_id) { values.push(class_id); conditions.push(`s.class_id=$${values.length}`); }
  if (term_id) { values.push(term_id); conditions.push(`i.term_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT i.id AS invoice_id, i.total_due, i.discount, i.due_date, s.id AS student_id, u.full_name,
            c.name AS class_name, p.full_name AS parent_name, p.phone AS parent_phone
     FROM fee_invoices i
     JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users p ON p.id = s.parent_id
     ${where}`,
    values
  );

  const settings = await getSettings();
  const withBalances = [];
  for (const row of rows) {
    const balanceInfo = await getInvoiceBalance(row, settings);
    if (balanceInfo.balance > 0) withBalances.push({ ...row, ...balanceInfo });
  }
  withBalances.sort((a, b) => b.balance - a.balance);
  res.json(withBalances);
});

router.post('/debtors/remind', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { invoice_ids } = req.body;
  if (!Array.isArray(invoice_ids) || !invoice_ids.length) {
    return res.status(400).json({ error: 'invoice_ids[] is required' });
  }
  const settings = await getSettings();
  const term = settings.current_term || 'this term';

  const results = [];
  for (const id of invoice_ids) {
    const row = await pool.query(
      `SELECT i.*, u.full_name AS student_name, p.phone AS parent_phone
       FROM fee_invoices i
       JOIN students s ON s.id = i.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN users p ON p.id = s.parent_id
       WHERE i.id=$1`,
      [id]
    );
    const invoice = row.rows[0];
    if (!invoice || !invoice.parent_phone) continue;
    const { balance } = await getInvoiceBalance(invoice, settings);
    const message = `Dear parent, ${invoice.student_name} owes GHS ${balance.toFixed(2)} for ${term}. Please settle at the office or pay online via the parent portal.`;
    const result = await sendSms(invoice.parent_phone, message);
    results.push({ invoice_id: id, ...result });
  }
  res.json({ sent: results.length, results });
});

export default router;
