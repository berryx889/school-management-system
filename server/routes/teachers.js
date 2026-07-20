import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const offset = (page - 1) * limit;
  const values = [];
  let where = "WHERE role='teacher'";
  if (search) {
    values.push(`%${search}%`);
    where += ` AND (full_name ILIKE $${values.length} OR username ILIKE $${values.length})`;
  }
  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT id, username, full_name, phone, email, department, photo_url, is_active, created_at
     FROM users ${where} ORDER BY full_name LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const total = await pool.query(`SELECT COUNT(*) FROM users ${where}`, values.slice(0, -2));
  res.json({ data: rows, total: Number(total.rows[0].count) });
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, phone, email, department, username, password } = req.body;
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'full_name, username and password are required' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (role, username, password_hash, full_name, phone, email, department)
       VALUES ('teacher',$1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, phone, email, department, is_active`,
      [username, password_hash, full_name, phone || null, email || null, department || null]
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
     WHERE id=$6 AND role='teacher' RETURNING id, username, full_name, phone, email, department, is_active`,
    [full_name, phone, email, department, is_active, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query("UPDATE users SET is_active=false WHERE id=$1 AND role='teacher'", [req.params.id]);
  res.status(204).end();
});

export default router;
