import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/admin', requireAuth, requireRole('admin'), async (_req, res) => {
  const date = todayStr();

  const [students, teachers, todayAttendance, feesCollected, feesOutstanding, recentPayments, recentAnnouncements, trend] =
    await Promise.all([
      pool.query("SELECT COUNT(*) FROM students WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='teacher' AND is_active=true"),
      pool.query(
        `SELECT status, COUNT(*) FROM attendance WHERE date=$1 GROUP BY status`,
        [date]
      ),
      pool.query(
        `SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p
         JOIN fee_invoices i ON i.id = p.invoice_id
         JOIN academic_terms t ON t.id = i.term_id AND t.is_current = true
         WHERE p.status='success'`
      ),
      pool.query(
        `SELECT COALESCE(SUM(i.total_due),0) - COALESCE((
            SELECT SUM(p.amount) FROM payments p WHERE p.status='success' AND p.invoice_id IN (SELECT id FROM fee_invoices)
          ),0) AS total FROM fee_invoices i`
      ),
      pool.query(
        `SELECT p.*, u.full_name AS student_name FROM payments p
         JOIN fee_invoices i ON i.id = p.invoice_id
         JOIN students s ON s.id = i.student_id
         JOIN users u ON u.id = s.user_id
         WHERE p.status='success' ORDER BY p.paid_at DESC LIMIT 5`
      ),
      pool.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`),
      pool.query(
        `SELECT date, COUNT(*) FILTER (WHERE status IN ('present','late')) AS present, COUNT(*) AS total
         FROM attendance WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
         GROUP BY date ORDER BY date`
      ),
    ]);

  const attendanceByStatus = { present: 0, absent: 0, late: 0 };
  for (const row of todayAttendance.rows) attendanceByStatus[row.status] = Number(row.count);

  res.json({
    total_students: Number(students.rows[0].count),
    total_teachers: Number(teachers.rows[0].count),
    present_today: attendanceByStatus.present,
    absent_today: attendanceByStatus.absent,
    late_today: attendanceByStatus.late,
    fees_collected: Number(feesCollected.rows[0].total),
    fees_outstanding: Math.max(0, Number(feesOutstanding.rows[0].total)),
    recent_payments: recentPayments.rows,
    recent_announcements: recentAnnouncements.rows,
    attendance_trend: trend.rows,
  });
});

router.get('/kitchen', requireAuth, requireRole('admin', 'kitchen'), async (_req, res) => {
  const date = todayStr();

  const [byClass, history] = await Promise.all([
    pool.query(
      `SELECT c.name AS class_name, COUNT(*) FILTER (WHERE a.status IN ('present','late')) AS present_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id AND s.status='active'
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date=$1
       GROUP BY c.name ORDER BY c.name`,
      [date]
    ),
    pool.query(
      `SELECT date, COUNT(*) FILTER (WHERE status IN ('present','late')) AS present_count
       FROM attendance WHERE date >= (CURRENT_DATE - INTERVAL '7 days')
       GROUP BY date ORDER BY date`
    ),
  ]);

  const total = byClass.rows.reduce((sum, r) => sum + Number(r.present_count), 0);

  res.json({ date, total_present: total, by_class: byClass.rows, history: history.rows });
});

export default router;
