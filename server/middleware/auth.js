import jwt from 'jsonwebtoken';
import { runInTenantScope } from '../db/pool.js';

// Verifies the JWT AND opens the tenant scope for the rest of the request: every query the
// handlers run then executes as the restricted role with app.school_id set to this user's
// school, so row-level security confines them to their own tenant. The client is released
// when the response finishes (or the connection closes). school_id defaults to 1 for tokens
// minted before multi-tenancy (transition shim; Phase 3 makes it authoritative).
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const schoolId = req.user.school_id || 1;
  req.schoolId = schoolId;
  runInTenantScope(
    schoolId,
    (release) => {
      res.on('finish', release);
      res.on('close', release);
    },
    () => next()
  ).catch(next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Gate for platform-wide surfaces (the lead/signup queue, and future cross-tenant admin).
// A platform owner is always an admin, but not every admin is a platform owner — customer
// schools' admins must never reach these. Layer after requireAuth.
export function requirePlatformOwner(req, res, next) {
  if (!req.user || !req.user.is_platform_owner) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
