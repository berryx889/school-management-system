import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requirePlatformOwner } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['new', 'contacted', 'declined'];

// No requireAuth: this is the public "interested school" signup form — a prospective
// customer submits it before they have any account at all. Mirrors GET /settings/public's
// pattern of an unauthenticated route reserved for the pre-login funnel.
router.post('/', async (req, res) => {
  const { school_name, contact_name, contact_email, contact_phone, desired_subdomain, message } = req.body;
  if (!school_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
    return res.status(400).json({ error: 'school_name, contact_name and contact_email are required' });
  }
  if (!EMAIL_RE.test(contact_email.trim())) {
    return res.status(400).json({ error: 'contact_email must be a valid email address' });
  }

  const { rows } = await pool.query(
    `INSERT INTO school_signups (school_name, contact_name, contact_email, contact_phone, desired_subdomain, message)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      school_name.trim(),
      contact_name.trim(),
      contact_email.trim(),
      contact_phone?.trim() || null,
      desired_subdomain?.trim() || null,
      message?.trim() || null,
    ]
  );
  res.status(201).json(rows[0]);
});

// Platform-owner-only: this is the SaaS lead queue, not per-school data. Gated on the
// users.is_platform_owner flag so a customer school's admin can never see other schools'
// leads — see middleware/auth.js and migration 013.
router.get('/', requireAuth, requirePlatformOwner, async (req, res) => {
  const { status } = req.query;
  const values = [];
  let where = '';
  if (status) {
    values.push(status);
    where = `WHERE status = $${values.length}`;
  }
  const { rows } = await pool.query(`SELECT * FROM school_signups ${where} ORDER BY created_at DESC`, values);
  res.json(rows);
});

router.patch('/:id', requireAuth, requirePlatformOwner, async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }
  const { rows } = await pool.query('UPDATE school_signups SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
