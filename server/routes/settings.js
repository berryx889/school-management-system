import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const settings = await pool.query('SELECT * FROM school_settings LIMIT 1');
  const bands = await pool.query('SELECT * FROM grade_bands ORDER BY min_score DESC');
  res.json({ ...settings.rows[0], grade_bands: bands.rows });
});

router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  const fields = [
    'name', 'short_name', 'logo_url', 'address', 'phone', 'motto',
    'current_academic_year', 'current_term', 'primary_color',
    'class_score_weight', 'exam_score_weight', 'late_threshold',
    'attendance_edit_cutoff', 'announcement_requires_approval',
  ];
  const current = await pool.query('SELECT id FROM school_settings LIMIT 1');
  const id = current.rows[0].id;

  const updates = fields.filter((f) => f in req.body);
  if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

  const setClause = updates.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = updates.map((f) => req.body[f]);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE school_settings SET ${setClause} WHERE id=$${values.length} RETURNING *`,
    values
  );
  res.json(rows[0]);
});

function validateBands(bands) {
  if (!Array.isArray(bands) || !bands.length) return 'At least one grade band is required';
  for (const b of bands) {
    const min = Number(b.min_score);
    const max = Number(b.max_score);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max) {
      return `Invalid range ${b.min_score}–${b.max_score}. Scores must be 0–100 with min ≤ max.`;
    }
    if (!b.grade?.toString().trim() || !b.remark?.toString().trim()) {
      return 'Every band needs a grade and a remark';
    }
  }
  const sorted = [...bands].map((b) => ({ min: Number(b.min_score), max: Number(b.max_score) })).sort((a, c) => a.min - c.min);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min <= sorted[i - 1].max) {
      return `Ranges overlap: ${sorted[i - 1].min}–${sorted[i - 1].max} and ${sorted[i].min}–${sorted[i].max}`;
    }
  }
  return null;
}

// Full replace-all: the admin edits the whole grading scale as one table (add/remove/
// reorder bands freely) and saves it atomically, rather than juggling per-row CRUD calls.
router.put('/grade-bands', requireAuth, requireRole('admin'), async (req, res) => {
  const { bands } = req.body;
  const error = validateBands(bands);
  if (error) return res.status(400).json({ error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM grade_bands');
    for (const b of bands) {
      await client.query(
        'INSERT INTO grade_bands (min_score, max_score, grade, remark) VALUES ($1,$2,$3,$4)',
        [Number(b.min_score), Number(b.max_score), b.grade.toString().trim(), b.remark.toString().trim()]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query('SELECT * FROM grade_bands ORDER BY min_score DESC');
  res.json(rows);
});

export default router;
