import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

// Admin-only: temporary conflation of "admin of my one school" and "owner of the
// platform" — there's no separate super-admin/platform-owner role yet. Once real customer
// schools exist, THEIR admins must not see this lead queue; revisit then.
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
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

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }
  const { rows } = await pool.query('UPDATE school_signups SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
