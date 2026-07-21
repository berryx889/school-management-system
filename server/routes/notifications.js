import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const STAFF_ROLES = ['admin', 'teacher', 'kitchen', 'accountant'];

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, type, title, message, is_read, created_at
     FROM notifications WHERE user_id=$1
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

router.get('/unread-count', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND NOT is_read',
    [req.user.id]
  );
  res.json({ count: Number(rows[0].count) });
});

router.put('/:id/read', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.put('/mark-all-read', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read=true WHERE user_id=$1 AND NOT is_read',
    [req.user.id]
  );
  res.json({ ok: true });
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { user_id, title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  if (user_id) {
    const staffCheck = await pool.query('SELECT role FROM users WHERE id=$1', [user_id]);
    if (!staffCheck.rows.length || !STAFF_ROLES.includes(staffCheck.rows[0].role)) {
      return res.status(400).json({ error: 'user_id must belong to a staff member' });
    }
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'admin_push', $2, $3) RETURNING *`,
      [user_id, title, message]
    );
    return res.status(201).json({ sent: 1, notifications: rows });
  }

  const { rows: staff } = await pool.query(
    'SELECT id FROM users WHERE role = ANY($1::user_role[]) AND is_active=true',
    [STAFF_ROLES]
  );
  if (!staff.length) return res.status(200).json({ sent: 0, notifications: [] });

  const valuesList = staff.map((_, i) => `($${i * 3 + 1}, 'admin_push', $${i * 3 + 2}, $${i * 3 + 3})`);
  const params = staff.flatMap((s) => [s.id, title, message]);
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ${valuesList.join(', ')} RETURNING *`,
    params
  );
  res.status(201).json({ sent: rows.length, notifications: rows });
});

export default router;
