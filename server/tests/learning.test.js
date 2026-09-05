import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startServer, stopServer, request, pool } from "./helpers.js";

let ctx,
  classId,
  otherClass,
  studentId,
  teacherId,
  studentUser,
  admin,
  teacher,
  student,
  otherTeacher,
  foreignStudent;
const prefix = `learning-test-${Date.now()}`;
before(async () => {
  ctx = await startServer();
  async function user(role, suffix) {
    return (
      await pool.query(
        "INSERT INTO users (school_id,role,username,password_hash,full_name) VALUES (1,$1,$2,$3,$2) RETURNING id",
        [role, `${prefix}-${suffix}`, "unused-test-hash"],
      )
    ).rows[0].id;
  }
  teacherId = await user("teacher", "teacher");
  studentUser = await user("student", "student");
  classId = (
    await pool.query(
      "INSERT INTO classes (school_id,name,level,class_teacher_id) VALUES (1,$1,'Primary',$2) RETURNING id",
      [prefix, teacherId],
    )
  ).rows[0].id;
  otherClass = (
    await pool.query(
      "INSERT INTO classes (school_id,name,level) VALUES (1,$1,'Primary') RETURNING id",
      [`${prefix}-other`],
    )
  ).rows[0].id;
  studentId = (
    await pool.query(
      "INSERT INTO students (school_id,user_id,student_code,class_id,qr_token) VALUES (1,$1,$2,$3,$2) RETURNING id",
      [studentUser, prefix, classId],
    )
  ).rows[0].id;
  const sign = (role, id, school_id = 1) =>
    jwt.sign({ role, id, school_id }, process.env.JWT_SECRET);
  admin = sign("super_admin", teacherId);
  teacher = sign("teacher", teacherId);
  student = sign("student", studentUser);
  otherTeacher = sign("teacher", studentUser);
  foreignStudent = sign("student", studentUser, 2147483647);
});
after(async () => {
  await pool.query("DELETE FROM teacher_feedback WHERE student_id=$1", [
    studentId,
  ]);
  await pool.query("DELETE FROM learning_posts WHERE class_id IN ($1,$2)", [
    classId,
    otherClass,
  ]);
  await pool.query("DELETE FROM students WHERE id=$1", [studentId]);
  await pool.query("DELETE FROM classes WHERE id IN ($1,$2)", [
    classId,
    otherClass,
  ]);
  await pool.query("DELETE FROM audit_logs WHERE actor_id IN ($1,$2)", [
    teacherId,
    studentUser,
  ]);
  await pool.query("DELETE FROM users WHERE id IN ($1,$2)", [
    teacherId,
    studentUser,
  ]);
  await stopServer(ctx.server);
  await pool.end();
});
const call = (path, token, method = "GET", body) =>
  request(ctx.baseUrl, `/learning${path}`, { token, method, body });
const homework = () => ({
  class_id: classId,
  kind: "homework",
  title: "Reading exercise",
  description: "Read and explain.",
  scheduled_at: new Date(Date.now() + 86400000).toISOString(),
});
test("class-scoped homework supports submission and review, and prevents bypasses", async () => {
  assert.equal((await call("/posts", student, "POST", homework())).status, 403);
  assert.equal(
    (await call("/posts", otherTeacher, "POST", homework())).status,
    403,
  );
  const created = await call("/posts", teacher, "POST", homework());
  assert.equal(created.status, 201);
  const id = created.data.id;
  const hidden = await call("/posts", admin, "POST", {
    ...homework(),
    class_id: otherClass,
    title: "Other class",
  });
  assert.equal(hidden.status, 201);
  const visible = await call(
    `/posts?kind=homework&class_id=${otherClass}`,
    student,
  );
  assert.deepEqual(
    visible.data.map((p) => p.id),
    [id],
    "student-supplied class ID must not change scope",
  );
  assert.equal(
    (
      await call(`/posts/${hidden.data.id}/answer`, student, "PUT", {
        answer: "forged",
      })
    ).status,
    404,
  );
  assert.equal((await call(`/posts/${id}/submissions`, student)).status, 403);
  assert.equal(
    (await call("/posts?kind=homework", foreignStudent)).status,
    404,
  );
  assert.equal(
    (await call(`/posts/${id}/answer`, student, "PUT", { answer: "My answer" }))
      .status,
    200,
  );
  const submissions = await call(`/posts/${id}/submissions`, teacher);
  assert.equal(submissions.data.length, 1);
  assert.equal(
    (
      await call(
        `/submissions/${submissions.data[0].id}/feedback`,
        teacher,
        "PUT",
        { feedback: "Well explained." },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/posts/${id}/answer`, student, "PUT", {
        answer: "Change after review",
      })
    ).status,
    409,
  );
  const updated = await call("/posts?kind=homework", student);
  assert.equal(updated.data[0].feedback, "Well explained.");
  await call(`/posts/${id}`, teacher, "DELETE");
  assert.equal((await call("/posts?kind=homework", student)).data.length, 0);
});
test("validates links, deadlines and staff editing authority", async () => {
  assert.equal(
    (
      await call("/posts", teacher, "POST", {
        ...homework(),
        url: "javascript:alert(1)",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/posts", teacher, "POST", {
        ...homework(),
        scheduled_at: null,
      })
    ).status,
    400,
  );
  const expired = await call("/posts", teacher, "POST", {
    ...homework(),
    scheduled_at: "2020-01-01T00:00:00Z",
  });
  assert.equal(
    (
      await call(`/posts/${expired.data.id}/answer`, student, "PUT", {
        answer: "Late",
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(`/posts/${expired.data.id}`, otherTeacher, "PUT", homework()))
      .status,
    403,
  );
  for (const kind of ["library", "examinations", "online-classes"]) {
    const result = await call("/posts", teacher, "POST", {
      ...homework(),
      kind,
      url: "https://example.org/lesson",
    });
    assert.equal(result.status, 201);
    assert.equal(
      (await call(`/posts?kind=${kind}`, student)).data[0].id,
      result.data.id,
    );
  }
});
test("teacher ratings are validated, saved once and visible only to administrators", async () => {
  assert.equal(
    (
      await call(`/teachers/${teacherId}/feedback`, student, "PUT", {
        rating: 6,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/teachers/${studentUser}/feedback`, student, "PUT", {
        rating: 4,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/teachers/${teacherId}/feedback`, student, "PUT", {
        rating: 4,
        comment: "Helpful explanations",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/teachers/${teacherId}/feedback`, student, "PUT", {
        rating: 5,
      })
    ).status,
    200,
  );
  assert.equal((await call("/teachers", student)).data[0].rating, 5);
  assert.equal((await call("/feedback", teacher)).status, 403);
  assert.equal((await call("/feedback", student)).status, 403);
  assert.equal(
    (await call("/feedback", admin)).data.filter((r) =>
      r.student_name.includes(prefix),
    ).length,
    1,
  );
});
