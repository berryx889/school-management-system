import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const STAFF_ROLES = ['admin', 'teacher', 'kitchen', 'accountant'];

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { page = 1, limit = 50, search, role, department, is_active } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['role = ANY($1::user_role[])'];
  const values = [STAFF_ROLES];
  if (search) { values.push(`%${search}%`); conditions.push(`(full_name ILIKE $${values.length} OR username ILIKE $${values.length})`); }
  if (role && STAFF_ROLES.includes(role)) { values.push(role); conditions.push(`role=$${values.length}`); }
  if (department) { values.push(department); conditions.push(`department=$${values.length}`); }
  if (is_active !== undefined) { values.push(is_active === 'true'); conditions.push(`is_active=$${values.length}`); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const listValues = [...values, limit, offset];
  const { rows } = await pool.query(
    `SELECT id, role, full_name, username, phone, email, department, is_active, created_at
     FROM users ${where} ORDER BY full_name LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues
  );
  const total = await pool.query(`SELECT COUNT(*) FROM users ${where}`, values);
  res.json({ data: rows, total: Number(total.rows[0].count) });
});

router.get('/summary', requireAuth, requireRole('admin'), async (_req, res) => {
  const totals = await pool.query(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active,
            COUNT(*) FILTER (WHERE NOT is_active) AS inactive
     FROM users WHERE role = ANY($1::user_role[])`,
    [STAFF_ROLES]
  );
  const byDept = await pool.query(
    `SELECT COALESCE(department,'Unassigned') AS department, COUNT(*) AS count
     FROM users WHERE role = ANY($1::user_role[]) GROUP BY department ORDER BY count DESC`,
    [STAFF_ROLES]
  );
  res.json({
    total: Number(totals.rows[0].total),
    active: Number(totals.rows[0].active),
    inactive: Number(totals.rows[0].inactive),
    by_department: byDept.rows.map((r) => ({ department: r.department, count: Number(r.count) })),
  });
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { role, full_name, username, password, phone, email, department } = req.body;
  if (!role || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${STAFF_ROLES.join(', ')}` });
  }
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'full_name, username and password are required' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (role, username, password_hash, full_name, phone, email, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, role, username, full_name, phone, email, department, is_active`,
      [role, username, password_hash, full_name, phone || null, email || null, department || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    throw err;
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, phone, email, department, is_active } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET full_name=COALESCE($1,full_name), phone=COALESCE($2,phone),
     email=COALESCE($3,email), department=COALESCE($4,department), is_active=COALESCE($5,is_active)
     WHERE id=$6 AND role = ANY($7::user_role[])
     RETURNING id, role, username, full_name, phone, email, department, is_active`,
    [full_name, phone, email, department, is_active, req.params.id, STAFF_ROLES]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('UPDATE users SET is_active=false WHERE id=$1 AND role = ANY($2::user_role[])', [req.params.id, STAFF_ROLES]);
  res.status(204).end();
});

export default router;
