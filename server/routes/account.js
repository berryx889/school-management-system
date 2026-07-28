import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { effectiveFeatures } from '../config/plans.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();

// The current school's plan and the optional modules it unlocks — the client gates nav and
// routes on this. Reads the caller's own school row (RLS self-policy confines it).
router.get('/features', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT plan, feature_overrides FROM schools WHERE id=$1', [req.schoolId]);
  const school = rows[0] || { plan: 'standard', feature_overrides: {} };
  res.json({ plan: school.plan, features: effectiveFeatures(school.plan, school.feature_overrides) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, role, full_name, username, phone, email, department, photo_url, totp_enabled FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ── Two-factor authentication (TOTP / authenticator app) ──

// Step 1: generate a secret (not yet active) and return a QR + otpauth URI to scan.
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const secret = await generateSecret();
  await pool.query('UPDATE users SET totp_secret=$1, totp_enabled=false WHERE id=$2', [secret, req.user.id]);
  const label = req.user.username || `user-${req.user.id}`;
  const uri = generateURI({ secret, label, issuer: 'School Management System' });
  const qr = await QRCode.toDataURL(uri);
  res.json({ secret, uri, qr });
});

// Step 2: confirm a code from the app to switch 2FA on.
router.post('/2fa/enable', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id=$1', [req.user.id]);
  const secret = rows[0]?.totp_secret;
  if (!secret) return res.status(400).json({ error: 'Start 2FA setup first' });
  const result = await verifyTotp({ token: String(code).trim(), secret });
  if (!result.valid) return res.status(401).json({ error: 'That code is not valid — try again' });
  await pool.query('UPDATE users SET totp_enabled=true WHERE id=$1', [req.user.id]);
  await auditFromReq(req, { action: 'account.2fa_enabled', entityType: 'user', entityId: req.user.id, summary: 'Enabled two-factor authentication' });
  res.json({ ok: true });
});

// Turn 2FA off (requires a current code to prove possession of the device).
router.post('/2fa/disable', requireAuth, async (req, res) => {
  const { code } = req.body;
  const { rows } = await pool.query('SELECT totp_secret, totp_enabled FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]?.totp_enabled) return res.json({ ok: true });
  const result = await verifyTotp({ token: String(code || '').trim(), secret: rows[0].totp_secret });
  if (!result.valid) return res.status(401).json({ error: 'Enter a current code to turn 2FA off' });
  await pool.query('UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=$1', [req.user.id]);
  await auditFromReq(req, { action: 'account.2fa_disabled', entityType: 'user', entityId: req.user.id, summary: 'Disabled two-factor authentication' });
  res.json({ ok: true });
});

// Self-service password change. A forced first-time change (must_change_password)
// skips the current-password check since the user is proving identity by having
// just logged in with the temporary password.
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const { rows } = await pool.query('SELECT password_hash, must_change_password FROM users WHERE id=$1', [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (!user.must_change_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password is required' });
    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2', [hash, req.user.id]);
  res.json({ ok: true });
});

// Admin resets any user's password to a fresh temporary one (per PRD 5.1).
router.post('/reset-password/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, 10);
  const { rows } = await pool.query(
    `UPDATE users SET password_hash=$1, must_change_password=true
     WHERE id=$2 RETURNING id, username, full_name, role`,
    [hash, req.params.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...rows[0], temp_password: tempPassword });
});

export default router;
