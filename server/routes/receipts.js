import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { getInvoiceBalance } from '../utils/finance.js';

const router = Router();

router.get('/:paymentId', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pay.*, i.total_due, i.term_id, i.discount, i.due_date, s.id AS student_id, u.full_name AS student_name,
            c.name AS class_name, t.year, t.term, ss.name AS school_name, ss.address, ss.phone, ss.logo_url,
            ss.primary_color, ss.late_fee_grace_days, ss.late_fee_percent
     FROM payments pay
     JOIN fee_invoices i ON i.id = pay.invoice_id
     JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     JOIN academic_terms t ON t.id = i.term_id
     CROSS JOIN school_settings ss
     WHERE pay.id=$1`,
    [req.params.paymentId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const receipt = rows[0];

  if (req.user.role === 'parent') {
    const owner = await pool.query('SELECT parent_id FROM students WHERE id=$1', [receipt.student_id]);
    if (owner.rows[0]?.parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  }

  const balanceInfo = await getInvoiceBalance(
    { id: receipt.invoice_id, total_due: receipt.total_due, discount: receipt.discount, due_date: receipt.due_date },
    { late_fee_grace_days: receipt.late_fee_grace_days, late_fee_percent: receipt.late_fee_percent }
  );
  receipt.balance_remaining = balanceInfo.balance;
  receipt.late_fee = balanceInfo.late_fee;

  res.json(receipt);
});

export default router;
