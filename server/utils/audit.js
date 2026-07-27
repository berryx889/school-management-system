import { adminPool } from '../db/pool.js';

function ipOf(req) {
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req?.ip || req?.socket?.remoteAddress || null;
}

// Low-level writer. Always on the admin pool with an explicit school_id, so audit rows are
// written outside any request's RLS scope and can't be forged/suppressed by tenant queries.
// Audit failures must never break the audited action, so errors are swallowed (logged only).
export async function logAudit({ schoolId, actor, action, entityType, entityId, summary, metadata, ip, userAgent }) {
  if (!schoolId || !action) return;
  try {
    await adminPool.query(
      `INSERT INTO audit_logs
         (school_id, actor_id, actor_label, action, entity_type, entity_id, summary, metadata, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        schoolId,
        actor?.id ?? null,
        actor ? `${actor.full_name || actor.username || 'user'} (${actor.role || '—'})` : null,
        action,
        entityType ?? null,
        entityId != null ? String(entityId) : null,
        summary ?? null,
        metadata ? JSON.stringify(metadata) : null,
        ip ?? null,
        userAgent ?? null,
      ]
    );
  } catch (err) {
    console.error('audit write failed:', action, err.message);
  }
}

// Convenience for authenticated request handlers: pulls tenant, actor and request metadata
// off req. Call AFTER the audited operation succeeds.
export function auditFromReq(req, { action, entityType, entityId, summary, metadata }) {
  return logAudit({
    schoolId: req?.schoolId ?? req?.user?.school_id,
    actor: req?.user,
    action,
    entityType,
    entityId,
    summary,
    metadata,
    ip: ipOf(req),
    userAgent: req?.headers?.['user-agent'] ?? null,
  });
}
