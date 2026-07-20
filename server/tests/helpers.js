import { app } from '../app.js';
import { pool } from '../db/pool.js';

export async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://localhost:${port}/api` };
}

export function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

export async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const PORTAL_BY_ROLE = { admin: 'staff', teacher: 'staff', kitchen: 'staff', accountant: 'staff', student: 'family', parent: 'family' };

// `role` is kept as the helper's public parameter (tests read clearly as "log in as this
// role") even though the API itself now only takes a portal and resolves the exact role.
export async function login(baseUrl, username, password, role) {
  const { data } = await request(baseUrl, '/auth/login', { method: 'POST', body: { username, password, portal: PORTAL_BY_ROLE[role] } });
  return data.token;
}

export { pool };
