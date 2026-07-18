import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { sendSms } from '../services/sms.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, full_name: user.full_name, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role are required' });
  }
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username=$1 AND role=$2 AND is_active=true',
    [username, role]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  let studentId = null;
  if (role === 'student') {
    const s = await pool.query('SELECT id FROM students WHERE user_id=$1', [user.id]);
    studentId = s.rows[0]?.id ?? null;
  }

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
      photo_url: user.photo_url,
      must_change_password: user.must_change_password,
      studentId,
    },
  });
});

router.post('/otp/request', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const { rows } = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
  if (!rows.length) return res.status(404).json({ error: 'No account found for this phone number' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1,$2,$3)',
    [phone, code, expires_at]
  );
  await sendSms(phone, `Your login code is ${code}. It expires in 10 minutes.`);
  res.json({ ok: true });
});

router.post('/otp/verify', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code are required' });

  const { rows } = await pool.query(
    `SELECT * FROM otp_codes WHERE phone=$1 AND code=$2 AND used=false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid or expired code' });

  await pool.query('UPDATE otp_codes SET used=true WHERE id=$1', [rows[0].id]);

  const userRes = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ error: 'No account found' });

  let studentId = null;
  if (user.role === 'student') {
    const s = await pool.query('SELECT id FROM students WHERE user_id=$1', [user.id]);
    studentId = s.rows[0]?.id ?? null;
  }

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
      photo_url: user.photo_url,
      studentId,
    },
  });
});

export default router;
