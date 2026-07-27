import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { adminPool } from '../db/pool.js';
import { requireAuth, requirePlatformOwner } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();

// This is the platform control plane: creating, listing and suspending tenant schools. It is
// inherently CROSS-tenant, so every query here runs on adminPool (owner role, bypasses RLS)
// rather than the request's tenant-scoped client — otherwise RLS would confine the platform
// owner to their own school. requirePlatformOwner is the gate; a normal school admin can't
// reach any of it.
router.use(requireAuth, requirePlatformOwner);

const DEFAULT_GRADE_BANDS = [
  [80, 100, '1', 'Excellent'],
  [70, 79, '2', 'Very good'],
  [60, 69, '3', 'Good'],
  [55, 59, '4', 'Credit'],
  [50, 54, '5', 'Pass'],
  [0, 49, '6', 'Fail'],
];

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// List every school with its user/student counts.
router.get('/', async (_req, res) => {
  const { rows } = await adminPool.query(
    `SELECT s.id, s.name, s.subdomain, s.code, s.is_active, s.created_at,
            (SELECT count(*) FROM users u WHERE u.school_id = s.id) AS user_count,
            (SELECT count(*) FROM students st WHERE st.school_id = s.id) AS student_count
     FROM schools s
     ORDER BY s.id`
  );
  res.json(rows);
});

// Provision a new tenant: the school, its settings row, default grade bands, and a first
// admin account. Returns the admin's temporary password once so the owner can hand it over.
router.post('/', async (req, res) => {
  const { name, code, subdomain, admin_full_name, admin_username, admin_password } = req.body;
  if (!name?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'name and code are required' });
  }
  const cleanCode = code.trim();
  const cleanSub = slugify(subdomain || code || name);
  const adminUser = (admin_username || 'admin').trim();
  const tempPassword = admin_password?.trim() || Math.random().toString(36).slice(2, 10);

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query('SELECT 1 FROM schools WHERE lower(code)=lower($1) OR lower(subdomain)=lower($2)', [cleanCode, cleanSub]);
    if (dup.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A school with that code or subdomain already exists' });
    }

    const school = (await client.query(
      'INSERT INTO schools (name, subdomain, code) VALUES ($1,$2,$3) RETURNING id, name, subdomain, code, is_active, created_at',
      [name.trim(), cleanSub, cleanCode]
    )).rows[0];

    await client.query(
      'INSERT INTO school_settings (school_id, name, short_name) VALUES ($1,$2,$3)',
      [school.id, name.trim(), cleanCode]
    );

    for (const [min, max, grade, remark] of DEFAULT_GRADE_BANDS) {
      await client.query(
        'INSERT INTO grade_bands (school_id, min_score, max_score, grade, remark) VALUES ($1,$2,$3,$4,$5)',
        [school.id, min, max, grade, remark]
      );
    }

    const password_hash = await bcrypt.hash(tempPassword, 10);
    await client.query(
      `INSERT INTO users (role, username, password_hash, full_name, school_id, must_change_password)
       VALUES ('admin',$1,$2,$3,$4,true)`,
      [adminUser, password_hash, admin_full_name?.trim() || 'School Administrator', school.id]
    );

    await client.query('COMMIT');
    await auditFromReq(req, {
      action: 'school.provision',
      entityType: 'school',
      entityId: school.id,
      summary: `Provisioned school "${school.name}" (${school.code})`,
      metadata: { code: school.code, subdomain: school.subdomain, admin_username: adminUser },
    });
    res.status(201).json({ ...school, admin_username: adminUser, admin_temp_password: tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Full detail for one school, including its admin accounts (so the owner can see who to
// contact and reset their access). Never returns password hashes.
router.get('/:id', async (req, res) => {
  const school = (await adminPool.query(
    'SELECT id, name, subdomain, code, is_active, created_at FROM schools WHERE id=$1',
    [req.params.id]
  )).rows[0];
  if (!school) return res.status(404).json({ error: 'Not found' });

  const counts = (await adminPool.query(
    `SELECT (SELECT count(*) FROM users    WHERE school_id=$1) AS user_count,
            (SELECT count(*) FROM users    WHERE school_id=$1 AND role='teacher') AS teacher_count,
            (SELECT count(*) FROM students WHERE school_id=$1) AS student_count`,
    [school.id]
  )).rows[0];

  const admins = (await adminPool.query(
    "SELECT id, username, full_name, is_active, must_change_password, created_at FROM users WHERE school_id=$1 AND role='admin' ORDER BY id",
    [school.id]
  )).rows;

  res.json({ ...school, ...counts, admins });
});

// Reset a school admin's password. Original temp passwords are never recoverable (stored
// hashed), so recovery = regenerate. Returns the new temp password ONCE and forces a change
// on next login.
router.post('/:id/reset-admin-password', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  const admin = (await adminPool.query(
    "SELECT id, username FROM users WHERE id=$1 AND school_id=$2 AND role='admin'",
    [user_id, req.params.id]
  )).rows[0];
  if (!admin) return res.status(404).json({ error: 'Admin not found for this school' });

  const tempPassword = Math.random().toString(36).slice(2, 10);
  const password_hash = await bcrypt.hash(tempPassword, 10);
  await adminPool.query('UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2', [password_hash, admin.id]);
  await auditFromReq(req, {
    action: 'school.reset_admin_password',
    entityType: 'school',
    entityId: req.params.id,
    summary: `Reset admin password for @${admin.username} (school #${req.params.id})`,
  });
  res.json({ username: admin.username, temp_password: tempPassword });
});

// Suspend / reactivate (or rename) a school. A suspended school can't be resolved at login.
router.patch('/:id', async (req, res) => {
  const { name, is_active } = req.body;
  const { rows } = await adminPool.query(
    `UPDATE schools SET name = COALESCE($1, name), is_active = COALESCE($2, is_active)
     WHERE id=$3 RETURNING id, name, subdomain, code, is_active, created_at`,
    [name ?? null, is_active ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await auditFromReq(req, {
    action: 'school.update',
    entityType: 'school',
    entityId: rows[0].id,
    summary: `${is_active === false ? 'Suspended' : is_active === true ? 'Reactivated' : 'Updated'} school "${rows[0].name}"`,
    metadata: { is_active: rows[0].is_active },
  });
  res.json(rows[0]);
});

export default router;
