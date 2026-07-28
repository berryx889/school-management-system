import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();
const finance = [requireAuth, requireRole('admin', 'accountant')];

// Income statement: fee income (successful payments) vs expenses over a period, with an
// expense-by-category breakdown. Optional ?from=&to= (dates); defaults to all-time.
router.get('/income-statement', ...finance, async (req, res) => {
  const { from, to } = req.query;
  const payRange = [], expRange = [];
  const payConds = ["status='success'"], expConds = ['deleted_at IS NULL'];
  if (from) { payRange.push(from); payConds.push(`paid_at >= $${payRange.length}`); expRange.push(from); expConds.push(`expense_date >= $${expRange.length}`); }
  if (to) { payRange.push(to); payConds.push(`paid_at <= $${payRange.length}`); expRange.push(to); expConds.push(`expense_date <= $${expRange.length}`); }

  const income = Number((await pool.query(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM payments WHERE ${payConds.join(' AND ')}`, payRange
  )).rows[0].total);

  const expenses = Number((await pool.query(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM expenses WHERE ${expConds.join(' AND ')}`, expRange
  )).rows[0].total);

  const byCategory = (await pool.query(
    `SELECT category, SUM(amount)::float AS total FROM expenses WHERE ${expConds.join(' AND ')} GROUP BY category ORDER BY total DESC`, expRange
  )).rows;

  res.json({ income, expenses, net: income - expenses, by_category: byCategory, from: from || null, to: to || null });
});

// List expenses (newest first), optionally filtered by category / date range.
router.get('/', ...finance, async (req, res) => {
  const { category, from, to } = req.query;
  const values = [], conds = ['e.deleted_at IS NULL'];
  if (category) { values.push(category); conds.push(`e.category = $${values.length}`); }
  if (from) { values.push(from); conds.push(`e.expense_date >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`e.expense_date <= $${values.length}`); }
  const where = `WHERE ${conds.join(' AND ')}`;

  const total = Number((await pool.query(`SELECT COALESCE(SUM(amount),0)::float AS t FROM expenses e ${where}`, values)).rows[0].t);
  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS recorded_by_name FROM expenses e
     LEFT JOIN users u ON u.id = e.recorded_by ${where}
     ORDER BY e.expense_date DESC, e.id DESC LIMIT 300`,
    values
  );
  res.json({ data: rows, total_amount: total });
});

router.post('/', ...finance, async (req, res) => {
  const { category, description, amount, expense_date } = req.body;
  if (!category?.trim() || amount == null || Number(amount) < 0) {
    return res.status(400).json({ error: 'category and a non-negative amount are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO expenses (category, description, amount, expense_date, recorded_by)
     VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5) RETURNING *`,
    [category.trim(), description?.trim() || null, Number(amount), expense_date || null, req.user.id]
  );
  await auditFromReq(req, {
    action: 'expense.create', entityType: 'expense', entityId: rows[0].id,
    summary: `Recorded ${category.trim()} expense of ${amount}`, metadata: { category: category.trim(), amount: Number(amount) },
  });
  res.status(201).json(rows[0]);
});

router.put('/:id', ...finance, async (req, res) => {
  const { category, description, amount, expense_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE expenses SET
       category = COALESCE($1, category),
       description = COALESCE($2, description),
       amount = COALESCE($3, amount),
       expense_date = COALESCE($4, expense_date)
     WHERE id=$5 AND deleted_at IS NULL RETURNING *`,
    [category?.trim() ?? null, description?.trim() ?? null, amount != null ? Number(amount) : null, expense_date ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', ...finance, async (req, res) => {
  const { rows } = await pool.query('UPDATE expenses SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await auditFromReq(req, { action: 'expense.delete', entityType: 'expense', entityId: req.params.id, summary: `Deleted expense #${req.params.id}` });
  res.status(204).end();
});

export default router;
