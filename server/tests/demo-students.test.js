import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool, startServer, stopServer, request } from './helpers.js';

after(() => pool.end());

test('demo dataset has exactly 300 pupils, complete class subjects, and can be replayed safely', async () => {
  const sql = await fs.readFile(new URL('../migrations/028_ghana_demo_students.sql', import.meta.url), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const original = (await client.query(`SELECT md5(string_agg(row_to_json(u)::text, ',' ORDER BY id)) AS fingerprint
      FROM users u WHERE username NOT LIKE 'DEMO-202609-%'`)).rows[0].fingerprint;
    await client.query(sql);
    const summary = (await client.query(`SELECT count(*)::int AS students, count(DISTINCT s.class_id)::int AS classes,
      count(DISTINCT u.password_hash)::int AS passwords, count(*) FILTER(WHERE s.parent_id IS NOT NULL OR u.phone IS NOT NULL OR u.email IS NOT NULL)::int AS contacts,
      count(*) FILTER(WHERE NOT u.must_change_password)::int AS permanent_passwords
      FROM students s JOIN users u ON u.id=s.user_id WHERE s.school_id=1 AND s.student_code LIKE 'DEMO-202609-%'`)).rows[0];
    assert.deepEqual(summary, {students:300, classes:14, passwords:300, contacts:0, permanent_passwords:0});
    const distribution = (await client.query(`SELECT c.level, count(*)::int AS students FROM students s JOIN classes c ON c.id=s.class_id
      WHERE s.school_id=1 AND s.student_code LIKE 'DEMO-202609-%' GROUP BY c.level ORDER BY c.level`)).rows;
    assert.equal(distribution.reduce((sum,r)=>sum+r.students,0),300);
    const counts = (await client.query(`SELECT s.class_id,count(*)::int AS n FROM students s
      WHERE s.school_id=1 AND s.student_code LIKE 'DEMO-202609-%' GROUP BY s.class_id`)).rows;
    assert.equal(counts.filter(r=>r.n===22).length,6);
    assert.equal(counts.filter(r=>r.n===21).length,8);
    const noSubjects = await client.query(`SELECT 1 FROM students s WHERE s.school_id=1 AND s.student_code LIKE 'DEMO-202609-%'
      AND NOT EXISTS(SELECT 1 FROM class_subjects cs WHERE cs.class_id=s.class_id AND cs.deleted_at IS NULL)`);
    assert.equal(noSubjects.rows.length,0);
    assert.equal((await client.query(`SELECT count(DISTINCT cs.class_id)::int AS n FROM class_subjects cs JOIN subjects su ON su.id=cs.subject_id
      JOIN students s ON s.class_id=cs.class_id WHERE s.school_id=1 AND s.student_code LIKE 'DEMO-202609-%'
      AND su.name='Career Technology' AND cs.deleted_at IS NULL`)).rows[0].n,3);
    const hashedBefore = (await client.query("SELECT password_hash FROM users WHERE school_id=1 AND username='DEMO-202609-238'")).rows[0].password_hash;
    await client.query(sql);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM students WHERE school_id=1 AND student_code LIKE 'DEMO-202609-%'")).rows[0].n,300);
    assert.equal((await client.query("SELECT password_hash FROM users WHERE school_id=1 AND username='DEMO-202609-238'")).rows[0].password_hash,hashedBefore);
    assert.equal((await client.query(`SELECT md5(string_agg(row_to_json(u)::text, ',' ORDER BY id)) AS fingerprint
      FROM users u WHERE username NOT LIKE 'DEMO-202609-%'`)).rows[0].fingerprint,original);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('new regular admissions ignore recent demo IDs and retain the STU sequence', async () => {
  const suffix = crypto.randomUUID();
  let schoolId, ctx;
  try {
    schoolId = (await pool.query('INSERT INTO schools(name,code,subdomain) VALUES ($1,$2,$2) RETURNING id', ['Admission test',suffix])).rows[0].id;
    const adminId = (await pool.query("INSERT INTO users(school_id,role,username,password_hash,full_name) VALUES ($1,'admin','test-admin','unused','Admission test') RETURNING id",[schoolId])).rows[0].id;
    for (const code of ['STU0100','DEMO-202609-300']) {
      const uid=(await pool.query("INSERT INTO users(school_id,role,username,password_hash,full_name) VALUES ($1,'student',$2,'unused','Demo fixture') RETURNING id",[schoolId,code])).rows[0].id;
      await pool.query('INSERT INTO students(school_id,user_id,student_code,qr_token) VALUES ($1,$2,$3,$4)',[schoolId,uid,code,crypto.randomUUID()]);
    }
    ctx = await startServer();
    const token=jwt.sign({id:adminId,school_id:schoolId,role:'admin'},process.env.JWT_SECRET);
    const response=await request(ctx.baseUrl,'/students',{method:'POST',token,body:{full_name:'Admission test student',parent_phone:'0000000000'}});
    assert.equal(response.status,201);
    assert.equal(response.data.student_code,'STU0101');
    const first=await request(ctx.baseUrl,'/students?limit=2&page=1',{token});
    const second=await request(ctx.baseUrl,'/students?limit=2&page=2',{token});
    assert.equal(first.data.total,3);
    assert.equal(first.data.data.length+second.data.data.length,3);
    assert.equal(new Set([...first.data.data,...second.data.data].map(s=>s.id)).size,3);
  } finally {
    if(ctx) await stopServer(ctx.server);
    if(schoolId) await pool.query('DELETE FROM schools WHERE id=$1',[schoolId]);
  }
});
