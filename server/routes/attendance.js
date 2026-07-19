import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getLateThreshold() {
  const { rows } = await pool.query('SELECT late_threshold FROM school_settings LIMIT 1');
  return rows[0]?.late_threshold || '07:45:00';
}

// Scan a student's QR code at the gate. QR attendance always wins: a later manual
// mark can only add an absent record where no QR record exists for the day, never
// downgrade a QR "present"/"late" into "absent".
router.post('/scan', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ error: 'qr_token is required' });

  const studentRes = await pool.query(
    `SELECT s.*, u.full_name, u.photo_url, c.name AS class_name
     FROM students s JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.qr_token=$1 AND s.status='active'`,
    [qr_token]
  );
  if (!studentRes.rows.length) return res.status(404).json({ error: 'QR code not recognized' });
  const student = studentRes.rows[0];

  const date = todayStr();
  const existing = await pool.query('SELECT * FROM attendance WHERE student_id=$1 AND date=$2', [student.id, date]);
  if (existing.rows.length) {
    return res.json({
      duplicate: true,
      student,
      attendance: existing.rows[0],
      message: 'Already checked in today',
    });
  }

  const now = new Date();
  const nowTime = now.toTimeString().slice(0, 8);
  const lateThreshold = await getLateThreshold();
  const status = nowTime > lateThreshold ? 'late' : 'present';

  const { rows } = await pool.query(
    `INSERT INTO attendance (student_id, date, status, check_in_time, method, marked_by)
     VALUES ($1,$2,$3,$4,'qr',$5) RETURNING *`,
    [student.id, date, status, nowTime, req.user.id]
  );

  res.json({ duplicate: false, student, attendance: rows[0] });
});

// Bulk manual marking by a teacher for their class. QR-marked students for the day
// are left untouched (see rule above); only students without an existing record
// for the date get inserted/updated.
router.post('/manual', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_id, date, records } = req.body;
  if (!class_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'class_id, date and records[] are required' });
  }

  const settings = await pool.query('SELECT attendance_edit_cutoff FROM school_settings LIMIT 1');
  const cutoff = settings.rows[0]?.attendance_edit_cutoff || '10:00:00';
  const isToday = date === todayStr();
  const nowTime = new Date().toTimeString().slice(0, 8);
  if (req.user.role === 'teacher' && isToday && nowTime > cutoff) {
    return res.status(403).json({ error: `Attendance edits are locked after ${cutoff.slice(0, 5)}. Contact an admin.` });
  }

  const saved = [];
  for (const record of records) {
    const { student_id, status, remark } = record;
    const existing = await pool.query('SELECT * FROM attendance WHERE student_id=$1 AND date=$2', [student_id, date]);
    if (existing.rows.length && existing.rows[0].method === 'qr') {
      saved.push(existing.rows[0]); // never downgrade a QR record
      continue;
    }
    const { rows } = await pool.query(
      `INSERT INTO attendance (student_id, date, status, method, marked_by, remark)
       VALUES ($1,$2,$3,'manual',$4,$5)
       ON CONFLICT (student_id, date) DO UPDATE SET status=$3, marked_by=$4, remark=$5
       RETURNING *`,
      [student_id, date, status, req.user.id, remark || null]
    );
    saved.push(rows[0]);
  }
  res.json(saved);
});

router.get('/', requireAuth, async (req, res) => {
  const { class_id, date, student_id, month } = req.query;

  if (student_id && month) {
    const { rows } = await pool.query(
      `SELECT * FROM attendance WHERE student_id=$1 AND to_char(date,'YYYY-MM')=$2 ORDER BY date`,
      [student_id, month]
    );
    return res.json(rows);
  }

  if (class_id && date) {
    const { rows } = await pool.query(
      `SELECT a.*, s.id AS student_id, u.full_name, u.photo_url, s.student_code
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
       WHERE s.class_id=$1 AND s.status='active'
       ORDER BY u.full_name`,
      [class_id, date]
    );
    return res.json(rows);
  }

  return res.status(400).json({ error: 'Provide (class_id & date) or (student_id & month)' });
});

export default router;
