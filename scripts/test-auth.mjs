import { spawn } from 'node:child_process';
import { openSync, closeSync, mkdirSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

mkdirSync('.next', { recursive: true });
const services = [];
function start(args, env, log) {
  const output = openSync(log, 'w');
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', output, output],
    windowsHide: true,
  });
  closeSync(output);
  services.push(child);
  return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Auth test service exited; inspect .next/auth-*.log.`);
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* Service is starting. */
    }
    await setTimeout(250);
  }
  throw new Error('Auth test service did not become ready. Inspect .next/auth-*.log.');
}
function stop() {
  for (const service of services.reverse()) {
    if (!service.pid || service.exitCode !== null) continue;
    try {
      service.kill('SIGKILL');
    } catch {
      /* The owned test process may have exited already. */
    }
  }
}
try {
  for (const url of ['http://127.0.0.1:54329/__test__/health', 'http://127.0.0.1:3001/signin']) {
    let occupied = false;
    try {
      await fetch(url, { signal: AbortSignal.timeout(500) });
      occupied = true;
    } catch {
      /* Free port. */
    }
    if (occupied) throw new Error('Auth test ports 3001 and 54329 must be free.');
  }
  const provider = start(['tests/fixtures/auth-provider.mjs'], {}, '.next/auth-provider.log');
  await ready('http://127.0.0.1:54329/__test__/health', provider);
  const app = start(
    ['tests/fixtures/auth-app.mjs'],
    {
      NEXT_BUILD_DIR: '.next/auth-e2e',
      GAMAZON_DEMO: 'false',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-auth-contract-fixture',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
    },
    '.next/auth-preview.log',
  );
  await ready('http://127.0.0.1:3001/signin', app);
  // Compile the dev routes before browser assertions start their interaction timers.
  for (const path of [
    '/signup',
    '/reset-password',
    '/community',
    '/admin',
    '/api/v1/session',
    '/api/v1/state',
    '/api/v1/posts',
    '/api/v1/metrics',
    '/api/v1/join',
  ]) {
    const response = await fetch(`http://127.0.0.1:3001${path}`, {
      signal: AbortSignal.timeout(60000),
    });
    await response.arrayBuffer();
    if (response.status >= 500) throw new Error(`Auth test route ${path} failed to compile.`);
  }
  const tests = spawn(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      '-c',
      'playwright.auth.config.ts',
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit', windowsHide: true, env: { ...process.env, GAMAZON_AUTH_EXTERNAL: 'true' } },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    tests.on('error', reject);
    tests.on('exit', (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stop();
}
