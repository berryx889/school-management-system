import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

function sslFor(url) {
  return url.includes('neon.tech') || url.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;
}

const adminUrl = process.env.DATABASE_URL || '';
// The running server issues tenant queries as a NON-SUPERUSER role so RLS is enforced
// (superusers silently bypass RLS). Falls back to the admin URL if unset — but note that
// with that fallback RLS will NOT enforce, since the admin role bypasses it.
const appUrl = process.env.DATABASE_APP_URL || adminUrl;

// Admin pool: migrations, seed, and trusted server-side paths (auth bootstrap, webhooks).
// Connects as the owner/superuser and is NOT subject to row-level security.
export const adminPool = new pg.Pool({ connectionString: adminUrl, ssl: sslFor(adminUrl) });

// App pool: tenant-scoped request queries, as the restricted role. Subject to RLS.
export const appPool = new pg.Pool({ connectionString: appUrl, ssl: sslFor(appUrl) });

// Holds the current request's tenant-bound client so the `pool` façade can find it without
// every call site having to thread it through.
const tenantStore = new AsyncLocalStorage();

// A no-op-release wrapper: routes that open their own transaction via `pool.connect()` reuse
// the request's tenant client, and their `client.release()` must NOT return it to the pool
// mid-request — the tenant middleware owns its lifecycle and releases it when the response ends.
function nonReleasingHandle(client) {
  return { query: (...args) => client.query(...args), release: () => {} };
}

// The `pool` façade preserves the original `pool.query(...)` / `pool.connect()` call sites
// everywhere. Inside a tenant scope it routes to the request's RLS-enforced client; outside
// one (migrations, seed, auth, webhooks) it uses the admin pool.
export const pool = {
  query: (...args) => {
    const store = tenantStore.getStore();
    return store ? store.client.query(...args) : adminPool.query(...args);
  },
  connect: (...args) => {
    const store = tenantStore.getStore();
    return store ? Promise.resolve(nonReleasingHandle(store.client)) : adminPool.connect(...args);
  },
  // Used by scripts (migrations, seed, tests) to shut down cleanly — closes both pools.
  end: () => Promise.all([adminPool.end(), appPool.end()]),
};

// Runs `fn` with a tenant-bound client checked out of the app pool and `app.school_id` set
// (session-scoped, re-set on every request so a recycled connection can never carry a stale
// tenant). Individual routes manage their own transactions; this just guarantees the client
// is released. `registerRelease` is handed a release fn to fire when the response ends.
export async function runInTenantScope(schoolId, registerRelease, fn) {
  const client = await appPool.connect();
  try {
    await client.query("SELECT set_config('app.school_id', $1, false)", [String(schoolId)]);
  } catch (err) {
    client.release();
    throw err;
  }
  let released = false;
  registerRelease(() => {
    if (released) return;
    released = true;
    client.release();
  });
  return tenantStore.run({ client, schoolId }, fn);
}
