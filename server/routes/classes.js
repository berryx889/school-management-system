import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.full_name AS class_teacher_name,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status='active') AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.class_teacher_id
    ORDER BY c.name
  `);
  res.json(rows);
});

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM classes WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, level, class_teacher_id } = req.body;
  if (!name || !level) return res.status(400).json({ error: 'name and level are required' });
  const { rows } = await pool.query(
    'INSERT INTO classes (name, level, class_teacher_id) VALUES ($1,$2,$3) RETURNING *',
    [name, level, class_teacher_id || null]
  );
  res.status(201).json(rows[0]);
});

// Bulk-generates a stage's classes from levels x sections (e.g. 3 levels x 2 sections = 6
// classes), naming each via a token template. `classes.name` has no DB-level UNIQUE
// constraint, so a case-insensitive app-level check is the only guard against duplicates —
// a pre-existing gap, not introduced here.
router.post('/bulk-generate', requireAuth, requireRole('admin'), async (req, res) => {
  const { stage_name, levels, sections, naming_format, capacity_per_class } = req.body;
  if (!stage_name || !Array.isArray(levels) || !levels.length || !Array.isArray(sections) || !sections.length) {
    return res.status(400).json({ error: 'stage_name, levels[], sections[] are required' });
  }
  const format = naming_format || '{stage} {level}{section}';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stage = await client.query(
      `INSERT INTO academic_stages (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name=academic_stages.name
       RETURNING *`,
      [stage_name]
    );

    const existing = await client.query('SELECT name FROM classes');
    const existingNames = new Set(existing.rows.map((r) => r.name.toLowerCase()));

    const created = [];
    const skipped = [];
    for (const level of levels) {
      for (const section of sections) {
        const name = format
          .replaceAll('{stage}', stage_name)
          .replaceAll('{level}', String(level))
          .replaceAll('{section}', String(section));
        if (existingNames.has(name.toLowerCase())) {
          skipped.push(name);
          continue;
        }
        existingNames.add(name.toLowerCase());
        const { rows } = await client.query(
          `INSERT INTO classes (name, level, stage_id, level_number, section, capacity)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [name, stage_name, stage.rows[0].id, Number(level) || null, String(section), capacity_per_class || null]
        );
        created.push(rows[0]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ stage: stage.rows[0], created, skipped });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, level, class_teacher_id } = req.body;
  const { rows } = await pool.query(
    'UPDATE classes SET name=COALESCE($1,name), level=COALESCE($2,level), class_teacher_id=$3 WHERE id=$4 RETURNING *',
    [name, level, class_teacher_id || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM classes WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
