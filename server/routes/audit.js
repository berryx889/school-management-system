import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Admin-only. Reads go through the request's tenant client, so RLS confines every row to the
// caller's own school — an admin can never read another school's history.
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { action, actor_id, from, to } = req.query;
  const conditions = [];
  const values = [];
  if (action) { values.push(action); conditions.push(`action = $${values.length}`); }
  if (actor_id) { values.push(actor_id); conditions.push(`actor_id = $${values.length}`); }
  if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
  if (to) { values.push(to); conditions.push(`created_at <= $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = Number((await pool.query(`SELECT count(*) FROM audit_logs ${where}`, values)).rows[0].count);

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  values.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(
    `SELECT id, actor_id, actor_label, action, entity_type, entity_id, summary, metadata, ip, user_agent, created_at
     FROM audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  res.json({ data: rows, total });
});

// Distinct actions present in this school's log — powers the filter dropdown.
router.get('/actions', requireAuth, requireRole('admin'), async (_req, res) => {
  const { rows } = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  res.json(rows.map((r) => r.action));
});

export default router;
