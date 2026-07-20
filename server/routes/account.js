import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, role, full_name, username, phone, email, department, photo_url FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Self-service password change. A forced first-time change (must_change_password)
// skips the current-password check since the user is proving identity by having
// just logged in with the temporary password.
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const { rows } = await pool.query('SELECT password_hash, must_change_password FROM users WHERE id=$1', [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (!user.must_change_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password is required' });
    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2', [hash, req.user.id]);
  res.json({ ok: true });
});

// Admin resets any user's password to a fresh temporary one (per PRD 5.1).
router.post('/reset-password/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, 10);
  const { rows } = await pool.query(
    `UPDATE users SET password_hash=$1, must_change_password=true
     WHERE id=$2 RETURNING id, username, full_name, role`,
    [hash, req.params.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...rows[0], temp_password: tempPassword });
});

export default router;
