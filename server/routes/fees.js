import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSms } from '../services/sms.js';

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
  const { term_id, class_id } = req.body;
  if (!term_id) return res.status(400).json({ error: 'term_id is required' });

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
    const result = await pool.query(
      `INSERT INTO fee_invoices (student_id, term_id, total_due)
       VALUES ($1,$2,$3)
       ON CONFLICT (student_id, term_id) DO UPDATE SET total_due=$3
       RETURNING id`,
      [student.id, term_id, total]
    );
    if (result.rows.length) created += 1;
  }
  res.json({ created });
});

async function withBalance(invoiceRows) {
  const results = [];
  for (const inv of invoiceRows) {
    const paid = await pool.query(
      "SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id=$1 AND status='success'",
      [inv.id]
    );
    results.push({ ...inv, paid: Number(paid.rows[0].paid), balance: Number(inv.total_due) - Number(paid.rows[0].paid) });
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
  const conditions = ['balance.amount > 0'];
  if (class_id) { values.push(class_id); conditions.push(`s.class_id=$${values.length}`); }
  if (term_id) { values.push(term_id); conditions.push(`i.term_id=$${values.length}`); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await pool.query(
    `SELECT i.id AS invoice_id, i.total_due, s.id AS student_id, u.full_name, c.name AS class_name,
            p.full_name AS parent_name, p.phone AS parent_phone, balance.amount AS balance
     FROM fee_invoices i
     JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users p ON p.id = s.parent_id
     CROSS JOIN LATERAL (
       SELECT i.total_due - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id=i.id AND status='success'),0) AS amount
     ) balance
     ${where}
     ORDER BY balance.amount DESC`,
    values
  );
  res.json(rows);
});

router.post('/debtors/remind', requireAuth, requireRole('admin', 'accountant'), async (req, res) => {
  const { invoice_ids } = req.body;
  if (!Array.isArray(invoice_ids) || !invoice_ids.length) {
    return res.status(400).json({ error: 'invoice_ids[] is required' });
  }
  const settings = await pool.query('SELECT current_term FROM school_settings LIMIT 1');
  const term = settings.rows[0]?.current_term || 'this term';

  const results = [];
  for (const id of invoice_ids) {
    const row = await pool.query(
      `SELECT i.total_due, u.full_name AS student_name, p.phone AS parent_phone,
              i.total_due - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id=i.id AND status='success'),0) AS balance
       FROM fee_invoices i
       JOIN students s ON s.id = i.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN users p ON p.id = s.parent_id
       WHERE i.id=$1`,
      [id]
    );
    const invoice = row.rows[0];
    if (!invoice || !invoice.parent_phone) continue;
    const message = `Dear parent, ${invoice.student_name} owes GHS ${Number(invoice.balance).toFixed(2)} for ${term}. Please settle at the office or pay online via the parent portal.`;
    const result = await sendSms(invoice.parent_phone, message);
    results.push({ invoice_id: id, ...result });
  }
  res.json({ sent: results.length, results });
});

export default router;
