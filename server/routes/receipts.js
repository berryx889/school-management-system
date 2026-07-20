import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:paymentId', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pay.*, i.total_due, i.term_id, s.id AS student_id, u.full_name AS student_name,
            c.name AS class_name, t.year, t.term, ss.name AS school_name, ss.address, ss.phone, ss.logo_url,
            ss.primary_color
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

  const paidSoFar = await pool.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id=$1 AND status='success'",
    [receipt.invoice_id]
  );
  receipt.balance_remaining = Number(receipt.total_due) - Number(paidSoFar.rows[0].total);

  res.json(receipt);
});

export default router;
