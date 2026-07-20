import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import XLSX from 'xlsx';
import QRCode from 'qrcode';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return '233' + digits.slice(1);
  return digits;
}

async function findOrCreateParent(client, { phone, name }) {
  const normalized = normalizePhone(phone);
  const existing = await client.query("SELECT id FROM users WHERE phone=$1 AND role='parent'", [normalized]);
  if (existing.rows.length) return existing.rows[0].id;

  const tempPassword = crypto.randomBytes(4).toString('hex');
  const password_hash = await bcrypt.hash(tempPassword, 10);
  const { rows } = await client.query(
    `INSERT INTO users (role, username, password_hash, full_name, phone, must_change_password)
     VALUES ('parent',$1,$2,$3,$1,true) RETURNING id`,
    [normalized, password_hash, name || 'Parent/Guardian']
  );
  return rows[0].id;
}

async function nextStudentCode(client) {
  const { rows } = await client.query(
    "SELECT student_code FROM students ORDER BY id DESC LIMIT 1"
  );
  const last = rows[0]?.student_code;
  const lastNum = last ? parseInt(last.replace(/\D/g, ''), 10) : 0;
  return `STU${String(lastNum + 1).padStart(4, '0')}`;
}

// Admin/teacher can list any student (needed for rosters, marks entry, attendance).
// A parent only ever sees their own children; a student only ever sees themself.
router.get('/', requireAuth, async (req, res) => {
  if (!['admin', 'teacher', 'parent', 'student', 'accountant'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { class_id, search, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;
  const values = [];
  const conditions = ["s.status != 'deleted'"];
  if (class_id) { values.push(class_id); conditions.push(`s.class_id=$${values.length}`); }
  if (search) { values.push(`%${search}%`); conditions.push(`(u.full_name ILIKE $${values.length} OR s.student_code ILIKE $${values.length})`); }
  if (req.user.role === 'parent') { values.push(req.user.id); conditions.push(`s.parent_id=$${values.length}`); }
  if (req.user.role === 'student') { values.push(req.user.id); conditions.push(`s.user_id=$${values.length}`); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT s.*, u.full_name, u.photo_url, u.phone, c.name AS class_name,
            p.full_name AS parent_name, p.phone AS parent_phone
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users p ON p.id = s.parent_id
     ${where}
     ORDER BY u.full_name
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const total = await pool.query(
    `SELECT COUNT(*) FROM students s JOIN users u ON u.id = s.user_id ${where}`,
    values.slice(0, -2)
  );
  res.json({ data: rows, total: Number(total.rows[0].count) });
});

router.get('/export', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id } = req.query;
  const values = [];
  const conditions = ["s.status != 'deleted'"];
  if (class_id) { values.push(class_id); conditions.push(`s.class_id=$${values.length}`); }

  const { rows } = await pool.query(
    `SELECT s.student_code, u.full_name, s.gender, s.dob, c.name AS class_name,
            p.full_name AS parent_name, p.phone AS parent_phone, s.status
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users p ON p.id = s.parent_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.full_name`,
    values
  );

  const escape = (value) => {
    const str = value == null ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = ['Student ID', 'Full Name', 'Gender', 'Date of Birth', 'Class', 'Parent Name', 'Parent Phone', 'Status'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.student_code, r.full_name, r.gender,
      r.dob ? new Date(r.dob).toISOString().slice(0, 10) : '',
      r.class_name, r.parent_name, r.parent_phone, r.status,
    ].map(escape).join(','));
  }

  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(lines.join('\n'));
});

router.post('/promote', requireAuth, requireRole('admin'), async (req, res) => {
  const { student_ids, class_id } = req.body;
  if (!Array.isArray(student_ids) || !student_ids.length) {
    return res.status(400).json({ error: 'student_ids[] is required' });
  }
  if (class_id) {
    const target = await pool.query('SELECT id FROM classes WHERE id=$1', [class_id]);
    if (!target.rows.length) return res.status(404).json({ error: 'Target class not found' });
  }

  const { rows } = await pool.query(
    `UPDATE students SET class_id=$1 WHERE id = ANY($2::int[]) AND status='active' RETURNING id`,
    [class_id || null, student_ids]
  );
  res.json({ updated: rows.length });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, u.full_name, u.photo_url, u.phone, c.name AS class_name,
            p.full_name AS parent_name, p.phone AS parent_phone
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users p ON p.id = s.parent_id
     WHERE s.id=$1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const student = rows[0];

  if (req.user.role === 'parent' && student.parent_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'student' && student.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(student);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, dob, gender, class_id, parent_phone, parent_name, photo_url } = req.body;
  if (!full_name || !parent_phone) {
    return res.status(400).json({ error: 'full_name and parent_phone are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parentId = await findOrCreateParent(client, { phone: parent_phone, name: parent_name });
    const studentCode = await nextStudentCode(client);
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const userRes = await client.query(
      `INSERT INTO users (role, username, password_hash, full_name, photo_url, must_change_password)
       VALUES ('student',$1,$2,$3,$4,true) RETURNING id`,
      [studentCode, password_hash, full_name, photo_url || null]
    );

    const studentRes = await client.query(
      `INSERT INTO students (user_id, student_code, class_id, dob, gender, parent_id, qr_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userRes.rows[0].id, studentCode, class_id || null, dob || null, gender || null, parentId, crypto.randomUUID()]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...studentRes.rows[0], full_name, temp_password: tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, dob, gender, class_id, status, photo_url } = req.body;
  const student = await pool.query('SELECT user_id FROM students WHERE id=$1', [req.params.id]);
  if (!student.rows.length) return res.status(404).json({ error: 'Not found' });

  if (full_name || photo_url) {
    await pool.query(
      'UPDATE users SET full_name=COALESCE($1,full_name), photo_url=COALESCE($2,photo_url) WHERE id=$3',
      [full_name, photo_url, student.rows[0].user_id]
    );
  }
  const { rows } = await pool.query(
    `UPDATE students SET dob=COALESCE($1,dob), gender=COALESCE($2,gender),
     class_id=$3, status=COALESCE($4,status) WHERE id=$5 RETURNING *`,
    [dob, gender, class_id ?? null, status, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query("UPDATE students SET status='deleted' WHERE id=$1", [req.params.id]);
  res.status(204).end();
});

router.get('/:id/qr-card', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, u.full_name, u.photo_url, c.name AS class_name
     FROM students s JOIN users u ON u.id = s.user_id
     LEFT JOIN classes c ON c.id = s.class_id WHERE s.id=$1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const student = rows[0];
  const qrDataUrl = await QRCode.toDataURL(student.qr_token, { margin: 1, width: 240 });
  res.json({ ...student, qr_data_url: qrDataUrl });
});

router.post('/import', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const classes = await pool.query('SELECT id, name FROM classes');
  const classByName = Object.fromEntries(classes.rows.map((c) => [c.name.toLowerCase(), c.id]));

  const results = { created: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const full_name = row.full_name || row['Full Name'];
    const parent_phone = row.parent_phone || row['Parent Phone'];
    const className = (row.class || row['Class'] || '').toString().toLowerCase();

    if (!full_name || !parent_phone) {
      results.errors.push({ row: index + 2, error: 'Missing full_name or parent_phone' });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const parentId = await findOrCreateParent(client, {
        phone: parent_phone,
        name: row.parent_name || row['Parent Name'],
      });
      const studentCode = await nextStudentCode(client);
      const tempPassword = crypto.randomBytes(4).toString('hex');
      const password_hash = await bcrypt.hash(tempPassword, 10);

      const userRes = await client.query(
        `INSERT INTO users (role, username, password_hash, full_name, must_change_password)
         VALUES ('student',$1,$2,$3,true) RETURNING id`,
        [studentCode, password_hash, full_name]
      );
      await client.query(
        `INSERT INTO students (user_id, student_code, class_id, dob, gender, parent_id, qr_token)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          userRes.rows[0].id,
          studentCode,
          classByName[className] || null,
          row.dob || row['DOB'] || null,
          row.gender || row['Gender'] || null,
          parentId,
          crypto.randomUUID(),
        ]
      );
      await client.query('COMMIT');
      results.created += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      results.errors.push({ row: index + 2, error: err.message });
    } finally {
      client.release();
    }
  }

  res.json(results);
});

router.get('/import/template', requireAuth, requireRole('admin'), (_req, res) => {
  const ws = XLSX.utils.json_to_sheet([
    { full_name: 'Ama Serwaa', dob: '2013-05-20', gender: 'female', class: 'Basic 4', parent_name: 'Mr. Serwaa', parent_phone: '0244000000' },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

export default router;
