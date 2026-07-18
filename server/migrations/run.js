import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
  );

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    console.log(`Applying migration ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ok`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  failed:`, err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log('Migrations up to date.');
  await pool.end();
}

run();
