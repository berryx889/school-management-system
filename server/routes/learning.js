import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { canAccessClass, isAdmin } from "../utils/access.js";
import { auditFromReq } from "../utils/audit.js";

const router = Router();
const kinds = ["homework", "library", "examinations", "online-classes"];
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
router.use(requireAuth, requireRole("admin", "teacher", "student"));
async function studentFor(req) {
  return (
    await pool.query(
      "SELECT id, class_id FROM students WHERE user_id=$1 AND status='active'",
      [req.user.id],
    )
  ).rows[0];
}
function text(value, max) {
  return typeof value === "string" && value.trim().length <= max;
}
function validUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
async function editable(req, post) {
  return (
    post &&
    (await canAccessClass(req.user, post.class_id)) &&
    (isAdmin(req.user) || post.author_id === req.user.id)
  );
}
router.get(
  "/classes",
  requireRole("admin", "teacher"),
  wrap(async (req, res) => {
    const rows = (
      await pool.query(
        "SELECT id,name FROM classes WHERE deleted_at IS NULL ORDER BY name",
      )
    ).rows;
    const allowed = [];
    for (const row of rows)
      if (await canAccessClass(req.user, row.id)) allowed.push(row);
    res.json(allowed);
  }),
);
router.get(
  "/posts",
  wrap(async (req, res) => {
    if (!kinds.includes(req.query.kind))
      return res.status(400).json({ error: "Choose a learning section." });
    const student = req.user.role === "student" ? await studentFor(req) : null;
    if (req.user.role === "student" && !student)
      return res
        .status(404)
        .json({
          error:
            "Your student record is unavailable. Please contact the school.",
        });
    const classId = student?.class_id || Number(req.query.class_id);
    if (!classId) return res.json([]);
    if (!student && !(await canAccessClass(req.user, classId)))
      return res
        .status(403)
        .json({ error: "You do not have access to this class." });
    const { rows } = await pool.query(
      `SELECT p.*, u.full_name AS author_name, h.answer, h.feedback, h.submitted_at, h.reviewed_at
     FROM learning_posts p JOIN users u ON u.id=p.author_id
     LEFT JOIN homework_submissions h ON h.post_id=p.id AND h.student_id=$3
     WHERE p.class_id=$1 AND p.kind=$2 AND NOT p.archived
     ORDER BY p.scheduled_at ASC NULLS LAST, p.created_at DESC LIMIT 200`,
      [classId, req.query.kind, student?.id || null],
    );
    res.json(
      rows.map((row) => ({
        ...row,
        can_edit:
          !student && (isAdmin(req.user) || row.author_id === req.user.id),
      })),
    );
  }),
);
async function save(req, res) {
  const { title, description = "", url = "", kind, scheduled_at } = req.body;
  const classId = Number(req.body.class_id);
  if (
    !kinds.includes(kind) ||
    !text(title, 160) ||
    !title.trim() ||
    !text(description, 10000) ||
    !text(url, 2000) ||
    !validUrl(url) ||
    !Number.isInteger(classId) ||
    classId < 1 ||
    (scheduled_at && !Number.isFinite(Date.parse(scheduled_at)))
  ) {
    return res
      .status(400)
      .json({
        error:
          "Enter a title, class, valid date, and an HTTPS link if provided.",
      });
  }
  if (["online-classes", "library"].includes(kind) && !url.trim())
    return res
      .status(400)
      .json({ error: "Add an HTTPS resource or meeting link." });
  if (
    ["homework", "examinations", "online-classes"].includes(kind) &&
    !scheduled_at
  )
    return res
      .status(400)
      .json({ error: "Choose a due date or session date." });
  if (!(await canAccessClass(req.user, classId)))
    return res
      .status(403)
      .json({ error: "You do not have access to this class." });
  if (req.params.id) {
    const post = (
      await pool.query(
        "SELECT * FROM learning_posts WHERE id=$1 AND NOT archived",
        [req.params.id],
      )
    ).rows[0];
    if (!(await editable(req, post)))
      return res
        .status(403)
        .json({
          error: "Only the author or an administrator can edit this item.",
        });
    if (post.kind !== kind || post.class_id !== classId)
      return res
        .status(400)
        .json({
          error: "The class and section cannot change after publication.",
        });
  }
  const values = [
    title.trim(),
    description.trim(),
    url.trim() || null,
    scheduled_at || null,
  ];
  const result = req.params.id
    ? await pool.query(
        "UPDATE learning_posts SET title=$1,description=$2,url=$3,scheduled_at=$4 WHERE id=$5 RETURNING *",
        [...values, req.params.id],
      )
    : await pool.query(
        "INSERT INTO learning_posts (title,description,url,scheduled_at,class_id,kind,author_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [...values, classId, kind, req.user.id],
      );
  await auditFromReq(req, {
    action: "learning.publish",
    entityType: "learning_post",
    entityId: result.rows[0].id,
    summary: `${req.params.id ? "Updated" : "Published"} ${kind.replaceAll("-", " ")}: ${title.trim()}`,
  });
  res.status(req.params.id ? 200 : 201).json(result.rows[0]);
}
router.post("/posts", requireRole("admin", "teacher"), wrap(save));
router.put("/posts/:id", requireRole("admin", "teacher"), wrap(save));
router.delete(
  "/posts/:id",
  requireRole("admin", "teacher"),
  wrap(async (req, res) => {
    const post = (
      await pool.query("SELECT * FROM learning_posts WHERE id=$1", [
        req.params.id,
      ])
    ).rows[0];
    if (!(await editable(req, post)))
      return res.status(403).json({ error: "You cannot archive this item." });
    await pool.query("UPDATE learning_posts SET archived=true WHERE id=$1", [
      post.id,
    ]);
    res.status(204).end();
  }),
);
router.put(
  "/posts/:id/answer",
  requireRole("student"),
  wrap(async (req, res) => {
    const student = await studentFor(req);
    const post = (
      await pool.query(
        "SELECT * FROM learning_posts WHERE id=$1 AND kind='homework' AND NOT archived",
        [req.params.id],
      )
    ).rows[0];
    if (!student || !post || post.class_id !== student.class_id)
      return res
        .status(404)
        .json({ error: "Homework not found for your class." });
    if (!text(req.body.answer, 20000) || !req.body.answer.trim())
      return res
        .status(400)
        .json({
          error:
            "Write your answer before submitting (up to 20,000 characters).",
        });
    if (post.scheduled_at && new Date(post.scheduled_at) < new Date())
      return res
        .status(409)
        .json({
          error: "The deadline has passed. Ask your teacher to extend it.",
        });
    const result = await pool.query(
      `INSERT INTO homework_submissions (post_id,student_id,answer) VALUES ($1,$2,$3)
    ON CONFLICT (post_id,student_id) DO UPDATE SET answer=EXCLUDED.answer,submitted_at=now()
    WHERE homework_submissions.reviewed_at IS NULL RETURNING id`,
      [post.id, student.id, req.body.answer.trim()],
    );
    if (!result.rows.length)
      return res
        .status(409)
        .json({ error: "Your teacher has already reviewed this submission." });
    res.json({ message: "Homework submitted successfully." });
  }),
);
router.get(
  "/posts/:id/submissions",
  requireRole("admin", "teacher"),
  wrap(async (req, res) => {
    const post = (
      await pool.query("SELECT * FROM learning_posts WHERE id=$1", [
        req.params.id,
      ])
    ).rows[0];
    if (!(await editable(req, post)))
      return res
        .status(403)
        .json({ error: "You cannot review these submissions." });
    res.json(
      (
        await pool.query(
          `SELECT h.*,u.full_name FROM homework_submissions h JOIN students s ON s.id=h.student_id
    JOIN users u ON u.id=s.user_id WHERE h.post_id=$1 ORDER BY h.submitted_at`,
          [post.id],
        )
      ).rows,
    );
  }),
);
router.put(
  "/submissions/:id/feedback",
  requireRole("admin", "teacher"),
  wrap(async (req, res) => {
    const row = (
      await pool.query(
        "SELECT p.* FROM homework_submissions h JOIN learning_posts p ON p.id=h.post_id WHERE h.id=$1",
        [req.params.id],
      )
    ).rows[0];
    if (!(await editable(req, row)))
      return res
        .status(403)
        .json({ error: "You cannot review this submission." });
    if (!text(req.body.feedback, 5000) || !req.body.feedback.trim())
      return res
        .status(400)
        .json({ error: "Enter feedback (up to 5,000 characters)." });
    await pool.query(
      "UPDATE homework_submissions SET feedback=$1,reviewed_at=now() WHERE id=$2",
      [req.body.feedback.trim(), req.params.id],
    );
    res.json({ message: "Feedback shared with the student." });
  }),
);
router.get(
  "/teachers",
  requireRole("student"),
  wrap(async (req, res) => {
    const student = await studentFor(req);
    if (!student) return res.json([]);
    res.json(
      (
        await pool.query(
          `SELECT u.id,u.full_name,f.rating,f.comment FROM users u
    LEFT JOIN teacher_feedback f ON f.teacher_id=u.id AND f.student_id=$2
    WHERE u.deleted_at IS NULL AND u.role='teacher' AND
    (EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.teacher_id=u.id AND cs.class_id=$1 AND cs.deleted_at IS NULL)
     OR EXISTS (SELECT 1 FROM classes c WHERE c.id=$1 AND c.class_teacher_id=u.id AND c.deleted_at IS NULL)) ORDER BY u.full_name`,
          [student.class_id, student.id],
        )
      ).rows,
    );
  }),
);
router.put(
  "/teachers/:id/feedback",
  requireRole("student"),
  wrap(async (req, res) => {
    const student = await studentFor(req);
    if (
      !student ||
      !(await canAccessClass(
        { role: "teacher", id: Number(req.params.id) },
        student.class_id,
      ))
    )
      return res
        .status(403)
        .json({ error: "You can only rate teachers assigned to your class." });
    const assigned = await pool.query(
      `SELECT 1 FROM users u WHERE u.id=$1 AND u.role='teacher' AND u.deleted_at IS NULL AND
    (EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.teacher_id=u.id AND cs.class_id=$2 AND cs.deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM classes c WHERE c.id=$2 AND c.class_teacher_id=u.id AND c.deleted_at IS NULL))`,
      [req.params.id, student.class_id],
    );
    if (!assigned.rows.length)
      return res
        .status(403)
        .json({ error: "This teacher is not assigned to your class." });
    const { rating, comment = "" } = req.body;
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      !text(comment, 2000)
    )
      return res
        .status(400)
        .json({
          error:
            "Choose a rating from 1 to 5 and a comment under 2,000 characters.",
        });
    await pool.query(
      `INSERT INTO teacher_feedback (student_id,teacher_id,rating,comment) VALUES ($1,$2,$3,$4)
    ON CONFLICT (student_id,teacher_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment,updated_at=now()`,
      [student.id, req.params.id, rating, comment.trim()],
    );
    res.json({
      message:
        "Thank you. Your feedback has been shared with school administrators.",
    });
  }),
);
router.get(
  "/feedback",
  requireRole("admin"),
  wrap(async (_req, res) => {
    res.json(
      (
        await pool.query(`SELECT f.id,f.rating,f.comment,f.updated_at,t.full_name AS teacher_name,u.full_name AS student_name
    FROM teacher_feedback f JOIN users t ON t.id=f.teacher_id JOIN students s ON s.id=f.student_id JOIN users u ON u.id=s.user_id
    ORDER BY f.updated_at DESC LIMIT 200`)
      ).rows,
    );
  }),
);
export default router;
