import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();

// Admin-only recycle bin over the soft-deletable entities. Reads go through the tenant client
// so RLS confines everything to the caller's own school. Table names come only from this
// whitelist (never from the request), so the interpolation below is safe.
const TYPES = {
  classes:        { table: 'classes',        label: 'name' },
  subjects:       { table: 'subjects',       label: 'name' },
  assessments:    { table: 'assessments',    label: 'title' },
  fee_structures: { table: 'fee_structures', label: 'item_name' },
};

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const result = {};
  for (const [type, { table, label }] of Object.entries(TYPES)) {
    const { rows } = await pool.query(
      `SELECT id, ${label} AS label, deleted_at FROM ${table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
    result[type] = rows;
  }
  // Students soft-delete via status rather than a timestamp.
  result.students = (await pool.query(
    `SELECT s.id, u.full_name AS label, NULL AS deleted_at
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'deleted' ORDER BY u.full_name`
  )).rows;

  // Teachers and staff soft-delete via users.deleted_at.
  result.teachers = (await pool.query(
    `SELECT id, full_name AS label, deleted_at FROM users
     WHERE role='teacher' AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`
  )).rows;
  result.staff = (await pool.query(
    `SELECT id, full_name AS label, deleted_at FROM users
     WHERE role = ANY($1::user_role[]) AND role <> 'teacher' AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    [['super_admin', 'admin', 'kitchen', 'accountant']]
  )).rows;

  res.json(result);
});

router.post('/restore', requireAuth, requireRole('admin'), async (req, res) => {
  const { type, id } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  let restored;
  if (type === 'students') {
    restored = (await pool.query("UPDATE students SET status='active' WHERE id=$1 AND status='deleted' RETURNING id", [id])).rows[0];
  } else if (type === 'teachers' || type === 'staff') {
    restored = (await pool.query('UPDATE users SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL RETURNING id', [id])).rows[0];
  } else if (TYPES[type]) {
    restored = (await pool.query(`UPDATE ${TYPES[type].table} SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL RETURNING id`, [id])).rows[0];
  } else {
    return res.status(400).json({ error: `type must be one of: ${[...Object.keys(TYPES), 'students', 'teachers', 'staff'].join(', ')}` });
  }

  if (!restored) return res.status(404).json({ error: 'Nothing to restore' });
  await auditFromReq(req, {
    action: 'record.restore',
    entityType: type,
    entityId: id,
    summary: `Restored ${type.replace(/_/g, ' ')} #${id} from trash`,
  });
  res.json({ ok: true });
});

export default router;
