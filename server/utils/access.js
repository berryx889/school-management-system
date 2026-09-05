import { pool } from '../db/pool.js';

export function isAdmin(user) {
  return ['super_admin', 'admin'].includes(user?.role);
}

export async function loadStudentAccess(studentId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.parent_id, s.class_id, c.class_teacher_id
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.id=$1 AND s.status != 'deleted'`,
    [studentId]
  );
  return rows[0] || null;
}

export async function canViewStudent(user, studentId, { accountant = false, teacher = true } = {}) {
  if (isAdmin(user) || (accountant && user?.role === 'accountant')) return true;
  const student = await loadStudentAccess(studentId);
  if (!student) return false;
  if (user?.role === 'student') return student.user_id === user.id;
  if (user?.role === 'parent') return student.parent_id === user.id;
  if (teacher && user?.role === 'teacher') return canAccessClass(user, student.class_id);
  return false;
}

export async function canAccessClass(user, classId) {
  if (isAdmin(user)) return true;
  if (user?.role !== 'teacher' || !classId) return false;
  const { rows } = await pool.query(
    `SELECT 1 FROM classes c
     WHERE c.id=$1 AND c.deleted_at IS NULL AND (
       c.class_teacher_id=$2 OR EXISTS (
         SELECT 1 FROM class_subjects cs
         WHERE cs.class_id=c.id AND cs.teacher_id=$2 AND cs.deleted_at IS NULL
       ) OR EXISTS (
         SELECT 1 FROM staff_permissions sp
         WHERE sp.class_id=c.id AND sp.user_id=$2
       )
     )`,
    [classId, user.id]
  );
  return rows.length > 0;
}
