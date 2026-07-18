import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSms } from '../services/sms.js';

const router = Router();

async function recipientsFor(audience, classId) {
  if (audience === 'teachers') {
    return (await pool.query("SELECT phone FROM users WHERE role='teacher' AND phone IS NOT NULL")).rows;
  }
  if (audience === 'parents' || audience === 'class') {
    const values = [];
    let where = "WHERE u.role='parent'";
    if (audience === 'class' && classId) {
      values.push(classId);
      where = `WHERE s.class_id=$1`;
      return (
        await pool.query(
          `SELECT DISTINCT p.phone FROM students s JOIN users p ON p.id = s.parent_id ${where} AND p.phone IS NOT NULL`,
          values
        )
      ).rows;
    }
    return (await pool.query(`SELECT phone FROM users u ${where} AND phone IS NOT NULL`)).rows;
  }
  // all
  return (await pool.query("SELECT phone FROM users WHERE phone IS NOT NULL AND is_active=true")).rows;
}

router.get('/', requireAuth, async (req, res) => {
  const { class_id } = req.query;
  const values = [];
  let where = '';
  if (class_id) { values.push(class_id); where = `WHERE class_id=$1 OR class_id IS NULL`; }
  const { rows } = await pool.query(
    `SELECT a.*, u.full_name AS created_by_name FROM announcements a
     LEFT JOIN users u ON u.id = a.created_by
     ${where} ORDER BY a.created_at DESC`,
    values
  );
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { title, body, audience, class_id, send_sms } = req.body;
  if (!title || !body || !audience) return res.status(400).json({ error: 'title, body, audience are required' });

  const settings = await pool.query('SELECT announcement_requires_approval FROM school_settings LIMIT 1');
  const needsApproval = req.user.role === 'teacher' && settings.rows[0]?.announcement_requires_approval;
  const status = needsApproval ? 'pending_approval' : 'sent';

  const { rows } = await pool.query(
    `INSERT INTO announcements (title, body, audience, class_id, send_sms, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, body, audience, class_id || null, Boolean(send_sms), status, req.user.id]
  );
  const announcement = rows[0];

  if (status === 'sent' && send_sms) {
    const recipients = await recipientsFor(audience, class_id);
    for (const r of recipients) await sendSms(r.phone, `${title}: ${body}`);
  }

  res.status(201).json(announcement);
});

router.post('/:id/send-sms', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM announcements WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const announcement = rows[0];

  await pool.query("UPDATE announcements SET status='sent', send_sms=true WHERE id=$1", [req.params.id]);

  const recipients = await recipientsFor(announcement.audience, announcement.class_id);
  let sent = 0;
  for (const r of recipients) {
    const result = await sendSms(r.phone, `${announcement.title}: ${announcement.body}`);
    if (result.ok) sent += 1;
  }
  res.json({ sent, total: recipients.length });
});

export default router;
