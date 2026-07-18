import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const url = process.env.DATABASE_URL || '';
const needsSsl = url.includes('neon.tech') || url.includes('sslmode=require');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});
