import { pool } from '../db/pool.js';

// Resolves which tenant a pre-login / public request is for. Usernames, phones and branding
// are per-school now, so any unauthenticated route that touches tenant data must scope by it.
// Order: explicit school code (X-School-Code header or body.schoolCode) → subdomain
// (prod: <sub>.app.tld) → the sole school if only one exists (single-tenant convenience, so
// the current UI keeps working without sending a code). Runs on the admin pool.
export async function resolveSchoolId(req) {
  const code = (req.headers['x-school-code'] || req.body?.schoolCode || '').toString().trim();
  if (code) {
    const r = await pool.query('SELECT id FROM schools WHERE lower(code)=lower($1) AND is_active=true', [code]);
    return r.rows[0]?.id ?? null;
  }
  const host = (req.hostname || '').toLowerCase();
  const sub = host.split('.')[0];
  if (host.includes('.') && !['localhost', '127', 'www'].includes(sub)) {
    const r = await pool.query('SELECT id FROM schools WHERE lower(subdomain)=lower($1) AND is_active=true', [sub]);
    if (r.rows[0]) return r.rows[0].id;
  }
  const only = await pool.query('SELECT id FROM schools WHERE is_active=true');
  return only.rows.length === 1 ? only.rows[0].id : null;
}
