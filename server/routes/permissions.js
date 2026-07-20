import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const STAFF_ROLES = ['admin', 'teacher', 'kitchen', 'accountant'];

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { user_id, class_id } = req.query;
  const conditions = [];
  const values = [];
  if (user_id) { values.push(user_id); conditions.push(`sp.user_id=$${values.length}`); }
  if (class_id) { values.push(class_id); conditions.push(`sp.class_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT sp.*, u.full_name AS user_name, u.role AS user_role, c.name AS class_name, sub.name AS subject_name
     FROM staff_permissions sp
     JOIN users u ON u.id = sp.user_id
     JOIN classes c ON c.id = sp.class_id
     LEFT JOIN subjects sub ON sub.id = sp.subject_id
     ${where}
     ORDER BY sp.created_at DESC`,
    values
  );
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { user_id, permission_type, class_id, subject_id } = req.body;
  if (!user_id || !permission_type || !class_id) {
    return res.status(400).json({ error: 'user_id, permission_type and class_id are required' });
  }
  if (!['marks_entry', 'remarks_entry'].includes(permission_type)) {
    return res.status(400).json({ error: "permission_type must be 'marks_entry' or 'remarks_entry'" });
  }
  if (permission_type === 'marks_entry' && !subject_id) {
    return res.status(400).json({ error: 'subject_id is required for marks_entry grants' });
  }

  const staffCheck = await pool.query('SELECT role FROM users WHERE id=$1', [user_id]);
  if (!staffCheck.rows.length || !STAFF_ROLES.includes(staffCheck.rows[0].role)) {
    return res.status(400).json({ error: 'user_id must belong to a staff member' });
  }

  const { rows } = await pool.query(
    `INSERT INTO staff_permissions (user_id, permission_type, class_id, subject_id, granted_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING RETURNING *`,
    [user_id, permission_type, class_id, permission_type === 'marks_entry' ? subject_id : null, req.user.id]
  );
  if (!rows.length) return res.status(409).json({ error: 'This grant already exists' });
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM staff_permissions WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
