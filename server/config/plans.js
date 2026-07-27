// Single source of truth for subscription plans and the optional modules they unlock.
//
// FEATURES are add-on modules only — core academics, finance, attendance and results are
// always available and are NOT listed here, so no plan can ever remove them. To gate a new
// module: add a key here, guard its routes with requireFeature(key), and tag its nav item
// with `feature: '<key>'` on the client.

export const FEATURES = {
  chat: { label: 'Parent–teacher chat', description: 'Direct messaging between teachers and parents' },
  gate_scanner: { label: 'QR gate scanner', description: 'Scan student QR codes at the gate for attendance' },
};

export const PLAN_ORDER = ['starter', 'standard', 'premium'];

export const PLANS = {
  starter: { label: 'Starter', features: [] },
  standard: { label: 'Standard', features: ['chat'] },
  premium: { label: 'Premium', features: ['chat', 'gate_scanner'] },
};

// Effective features for a school = its plan's bundle, with per-school overrides applied.
// `overrides` is a map like { chat: false, gate_scanner: true }.
export function effectiveFeatures(plan, overrides = {}) {
  const base = new Set(PLANS[plan]?.features || PLANS.standard.features);
  for (const [key, on] of Object.entries(overrides || {})) {
    if (!(key in FEATURES)) continue;
    if (on) base.add(key); else base.delete(key);
  }
  return [...base];
}

export function hasFeature(plan, overrides, key) {
  return effectiveFeatures(plan, overrides).includes(key);
}
