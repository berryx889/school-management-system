import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT h.*,
      (SELECT COUNT(*)::int FROM students s WHERE s.house_id=h.id AND s.status='active') AS member_count,
      (SELECT COALESCE(SUM(hp.points),0)::int FROM house_points hp WHERE hp.house_id=h.id) AS total_points
     FROM houses h
     WHERE h.is_active=true
     ORDER BY total_points DESC, h.name`
  );
  res.json(rows);
});

router.get('/points', requireAuth, async (req, res) => {
  const values = [];
  let where = '';
  if (req.query.house_id) { values.push(req.query.house_id); where = 'WHERE hp.house_id=$1'; }
  const { rows } = await pool.query(
    `SELECT hp.*, h.name AS house_name, h.color AS house_color,
            su.full_name AS student_name, au.full_name AS awarded_by_name
     FROM house_points hp JOIN houses h ON h.id=hp.house_id
     LEFT JOIN students s ON s.id=hp.student_id LEFT JOIN users su ON su.id=s.user_id
     LEFT JOIN users au ON au.id=hp.awarded_by
     ${where} ORDER BY hp.awarded_at DESC LIMIT 100`, values
  );
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, color, motto, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'House name is required' });
  const { rows } = await pool.query(
    `INSERT INTO houses (name,color,motto,description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name.trim(), color || '#6366F1', motto?.trim() || null, description?.trim() || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, color, motto, description, is_active } = req.body;
  const { rows } = await pool.query(
    `UPDATE houses SET name=COALESCE($1,name), color=COALESCE($2,color), motto=COALESCE($3,motto),
       description=COALESCE($4,description), is_active=COALESCE($5,is_active) WHERE id=$6 RETURNING *`,
    [name?.trim() || null, color || null, motto?.trim() || null, description?.trim() || null, is_active, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'House not found' });
  res.json(rows[0]);
});

router.post('/assign', requireAuth, requireRole('admin'), async (req, res) => {
  const { student_id, house_id } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });
  if (house_id) {
    const house = await pool.query('SELECT id FROM houses WHERE id=$1 AND is_active=true', [house_id]);
    if (!house.rows.length) return res.status(404).json({ error: 'House not found' });
  }
  const { rows } = await pool.query('UPDATE students SET house_id=$1 WHERE id=$2 RETURNING *', [house_id || null, student_id]);
  if (!rows.length) return res.status(404).json({ error: 'Student not found' });
  await auditFromReq(req, { action: 'house.assign', entityType: 'student', entityId: student_id, summary: `Assigned student #${student_id} to house #${house_id || 'none'}` });
  res.json(rows[0]);
});

router.post('/points', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { student_id, points, reason, category } = req.body;
  const numericPoints = Number(points);
  if (!student_id || !Number.isInteger(numericPoints) || numericPoints === 0 || Math.abs(numericPoints) > 1000 || !reason?.trim()) {
    return res.status(400).json({ error: 'student_id, non-zero whole points (max 1000), and reason are required' });
  }
  const student = await pool.query('SELECT house_id FROM students WHERE id=$1 AND status=\'active\'', [student_id]);
  if (!student.rows[0]?.house_id) return res.status(400).json({ error: 'Assign this student to a house first' });
  const { rows } = await pool.query(
    `INSERT INTO house_points (house_id,student_id,points,category,reason,awarded_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [student.rows[0].house_id, student_id, numericPoints, category?.trim() || 'general', reason.trim(), req.user.id]
  );
  await auditFromReq(req, { action: 'house.points_award', entityType: 'student', entityId: student_id, summary: `${numericPoints > 0 ? 'Awarded' : 'Deducted'} ${Math.abs(numericPoints)} house point(s)`, metadata: { points: numericPoints, reason: reason.trim() } });
  res.status(201).json(rows[0]);
});

export default router;
