import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { sendSms } from '../services/sms.js';

const router = Router();

const PORTAL_ROLES = {
  staff: ['admin', 'teacher', 'kitchen', 'accountant'],
  family: ['student', 'parent'],
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, full_name: user.full_name, username: user.username, is_platform_owner: user.is_platform_owner === true, school_id: user.school_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function buildAuthResponse(user) {
  let studentId = null;
  if (user.role === 'student') {
    const s = await pool.query('SELECT id FROM students WHERE user_id=$1', [user.id]);
    studentId = s.rows[0]?.id ?? null;
  }
  return {
    token: signToken(user),
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
      photo_url: user.photo_url,
      must_change_password: user.must_change_password,
      is_platform_owner: user.is_platform_owner === true,
      school_id: user.school_id,
      studentId,
    },
  };
}

// Resolves which tenant a pre-login request is for. Usernames/phones are only unique WITHIN
// a school now, so every credential lookup must be scoped. Order: explicit school code
// (X-School-Code header or body.schoolCode) → subdomain (prod: <sub>.app.tld) → the sole
// school if only one exists (single-tenant convenience so the current UI keeps working
// without sending a code). Runs on the admin pool — these are public, pre-auth lookups.
async function resolveSchoolId(req) {
  const code = (req.headers['x-school-code'] || req.body?.schoolCode || '').toString().trim();
  if (code) {
    const r = await pool.query('SELECT id FROM schools WHERE lower(code)=lower($1) AND is_active=true', [code]);
    return r.rows[0]?.id ?? null;
  }
  const host = (req.hostname || '').toLowerCase();
  const sub = host.split('.')[0];
  if (host.includes('.') && !['localhost', '127', 'www'].includes(sub)) {
    const r = await pool.query('SELECT id FROM schools WHERE lower(subdomain)=lower($1) AND is_active=true', [sub]);
    if (r.rows[0]) return r.rows[0].id;
  }
  const only = await pool.query('SELECT id FROM schools WHERE is_active=true');
  return only.rows.length === 1 ? only.rows[0].id : null;
}

// Login asks which portal (staff vs. student/parent) and which school, then resolves the
// exact role (admin/teacher/kitchen, or student/parent) from whichever account matches
// that username within that school.
router.post('/login', async (req, res) => {
  const { username, password, portal } = req.body;
  const roles = PORTAL_ROLES[portal];
  if (!username || !password || !roles) {
    return res.status(400).json({ error: 'username, password and a valid portal are required' });
  }
  const schoolId = await resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'A school code is required to sign in' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username=$1 AND school_id=$2 AND role = ANY($3::user_role[]) AND is_active=true',
    [username, schoolId, roles]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json(await buildAuthResponse(user));
});

router.post('/otp/request', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  const schoolId = await resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'A school code is required to sign in' });

  const { rows } = await pool.query(
    "SELECT id FROM users WHERE phone=$1 AND school_id=$2 AND role = ANY($3::user_role[])",
    [phone, schoolId, PORTAL_ROLES.family]
  );
  if (!rows.length) return res.status(404).json({ error: 'No account found for this phone number' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    'INSERT INTO otp_codes (phone, code, expires_at, school_id) VALUES ($1,$2,$3,$4)',
    [phone, code, expires_at, schoolId]
  );
  await sendSms(phone, `Your login code is ${code}. It expires in 10 minutes.`);
  res.json({ ok: true });
});

router.post('/otp/verify', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code are required' });
  const schoolId = await resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'A school code is required to sign in' });

  const { rows } = await pool.query(
    `SELECT * FROM otp_codes WHERE phone=$1 AND code=$2 AND school_id=$3 AND used=false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code, schoolId]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid or expired code' });

  await pool.query('UPDATE otp_codes SET used=true WHERE id=$1', [rows[0].id]);

  const userRes = await pool.query(
    "SELECT * FROM users WHERE phone=$1 AND school_id=$2 AND role = ANY($3::user_role[])",
    [phone, schoolId, PORTAL_ROLES.family]
  );
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ error: 'No account found' });

  res.json(await buildAuthResponse(user));
});

router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  const schoolId = await resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'A school code is required' });

  const { rows } = await pool.query(
    'SELECT id, phone FROM users WHERE username=$1 AND school_id=$2 AND is_active=true',
    [username, schoolId]
  );
  if (!rows.length || !rows[0].phone) {
    return res.status(404).json({ error: 'No account with a registered phone number found for this username' });
  }

  const phone = rows[0].phone;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    'INSERT INTO otp_codes (phone, code, expires_at, school_id) VALUES ($1,$2,$3,$4)',
    [phone, code, expires_at, schoolId]
  );
  await sendSms(phone, `Your password reset code is ${code}. It expires in 10 minutes.`);

  const masked = phone.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
  res.json({ ok: true, masked_phone: masked });
});

router.post('/reset-password', async (req, res) => {
  const { username, code, new_password } = req.body;
  if (!username || !code || !new_password) {
    return res.status(400).json({ error: 'username, code and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const schoolId = await resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'A school code is required' });

  const user = (await pool.query(
    'SELECT id, phone FROM users WHERE username=$1 AND school_id=$2 AND is_active=true',
    [username, schoolId]
  )).rows[0];
  if (!user || !user.phone) return res.status(404).json({ error: 'Account not found' });

  const otp = (await pool.query(
    `SELECT * FROM otp_codes WHERE phone=$1 AND code=$2 AND school_id=$3 AND used=false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.phone, code, schoolId]
  )).rows[0];
  if (!otp) return res.status(401).json({ error: 'Invalid or expired code' });

  await pool.query('UPDATE otp_codes SET used=true WHERE id=$1', [otp.id]);
  const password_hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, user.id]);

  res.json({ ok: true });
});

export default router;
