import 'dotenv/config';
import { spawn } from 'node:child_process';

const port = 4782;
const base = 'http://127.0.0.1:' + port;
const email = String(process.env.ADMIN_EMAIL || '').trim();
const password = String(process.env.ADMIN_PASSWORD || '');
const jwtSecret = process.env.JWT_SECRET || '';

// Report which setting is invalid without printing its value.
const checks = [
  ['MONGODB_URI', Boolean(process.env.MONGODB_URI) && !/YOUR_|REPLACE_WITH_/.test(process.env.MONGODB_URI || ''), 'must be configured using a private GitHub Actions secret'],
  ['JWT_SECRET', jwtSecret.length >= 32, 'must contain at least 32 characters'],
  ['ADMIN_EMAIL', /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email), 'must be a valid email address'],
  ['ADMIN_PASSWORD', password.length >= 12 && password.length <= 128, 'must be 12 to 128 characters']
];
const failures = checks.filter(([, pass]) => !pass);
for (const [key, , requirement] of failures) {
  console.error('Configuration issue: ' + key + ' ' + requirement + '.');
}
if (failures.length) process.exit(1);
console.log('PASS: Private backend configuration format');

// A short-lived backend is started only inside this GitHub Actions runner.
// Do not log secrets, student data, response bodies, or cookies.
const server = spawn(process.execPath, ['src/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'development',
    FRONTEND_ORIGINS: base + ',http://localhost:' + port
  },
  stdio: 'ignore'
});
server.on('error', () => {});

const get = async (url, opts = {}) => {
  const response = await fetch(base + url, {
    ...opts,
    signal: AbortSignal.timeout(6000),
    redirect: 'error'
  });
  return response;
};
const check = (ok, label) => {
  if (!ok) throw new Error(label + ' failed');
  console.log('PASS: ' + label);
};

let success = false;
try {
  let health;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error('API process exited before readiness');
    try {
      const r = await get('/api/health');
      if (r.ok) {
        health = await r.json();
        break;
      }
    } catch { /* server warming up */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  check(health?.status === 'ok', 'Express startup and MongoDB health');

  const clubs = await get('/api/clubs');
  const clubBody = await clubs.json();
  check(clubs.status === 200 && Array.isArray(clubBody.clubs), 'Public club directory API');

  const settings = await get('/api/settings');
  const settingBody = await settings.json();
  check(settings.status === 200 && typeof settingBody.academicYear === 'string', 'Public settings API');

  const denied = await get('/api/users');
  check(denied.status === 401, 'Admin endpoint blocks guests');

  const login = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:' + port },
    body: JSON.stringify({ email, password })
  });
  if (login.status !== 200) {
    if (login.status === 401) {
      throw new Error('Real admin login returned 401: ADMIN_EMAIL or ADMIN_PASSWORD may not match the initial account; do not put credentials in logs');
    }
    throw new Error('Real admin login returned HTTP ' + login.status);
  }
  check(true, 'Real administrator authentication');
  const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
  check(Boolean(cookie) && cookie.startsWith('haven_token='), 'HTTP-only session cookie issued');

  const me = await get('/api/me', { headers: { Cookie: cookie } });
  const account = await me.json();
  check(me.status === 200 && account.user?.role === 'admin', 'Authenticated admin session');

  const users = await get('/api/users', { headers: { Cookie: cookie } });
  check(users.status === 200, 'Admin-only users endpoint');

  const stats = await get('/api/stats', { headers: { Cookie: cookie } });
  check(stats.status === 200, 'Dashboard statistics endpoint');

  console.log('THE HAVEN backend/API integration smoke test succeeded. No records were inserted, updated or deleted.');
  success = true;
} catch (error) {
  console.error('Backend/API smoke test failed: ' + (error?.message || 'Unknown error'));
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
if (!success) process.exitCode = 1;
