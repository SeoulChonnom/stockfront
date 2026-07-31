#!/usr/bin/env node
/**
 * One-command bring-up for the pixel-perfect-react-ui visual-audit harness.
 *
 * Starts three long-lived background servers and leaves them running after
 * this script exits:
 *   1. reference-server.mjs   — static HTTP for docs/design_v2/handoff_v2/
 *   2. mock-api-server.mjs    — real HTTP mock API for the candidate build
 *   3. `vite preview`         — the candidate React app, BUILT FIRST with
 *                               VITE_API_HOST pointed at server #2's origin
 *
 * Rerun this script any time — it kills anything left over from a previous
 * run first (both via saved PIDs and a `pkill -f "vite preview"` sweep, per
 * the task brief: pnpm forwards a literal `--` into vite's argv and
 * silently drops every flag after it, so any stray `vite preview` MUST be
 * killed rather than reused / trusted to have bound the right port).
 *
 * After this exits 0, run the actual audit:
 *   node .claude/skills/pixel-perfect-react-ui/scripts/visual-audit.mjs \
 *     --config .visual-audit/config.json --mode all --no-fail-on-diff
 *
 * Tear down with: node .visual-audit/servers/stop.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CANDIDATE_PORT, HOST, MOCK_API_PORT, REFERENCE_PORT } from './ports.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const RUN_DIR = path.join(__dirname, '.run');

const CANDIDATE_BASE_URL = `http://${HOST}:${CANDIDATE_PORT}/stock/`;
const MOCK_API_ORIGIN = `http://${HOST}:${MOCK_API_PORT}`;

function sh(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return result.status ?? 1;
}

async function killStrayVitePreview() {
  // Best-effort; `pkill` exits 1 when nothing matched, which is fine.
  spawnSync('pkill', ['-f', 'vite preview'], { stdio: 'ignore' });
}

async function killSavedPids() {
  for (const name of ['reference-server', 'mock-api-server', 'vite-preview']) {
    try {
      const { readFile } = await import('node:fs/promises');
      const pid = Number((await readFile(path.join(RUN_DIR, `${name}.pid`), 'utf8')).trim());
      if (Number.isFinite(pid) && pid > 0) {
        process.kill(pid, 'SIGTERM');
      }
    } catch {
      // No saved PID, or process already gone — nothing to do.
    }
  }
}

function spawnDetached(name, cmd, args, env) {
  const logPath = path.join(RUN_DIR, `${name}.log`);
  const child = spawn(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  child.unref();
  return { child, logPath };
}

async function waitForHttp(url, { timeoutMs = 30_000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      // Any response (even a 404) proves the server is bound and answering.
      if (response) return true;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`);
}

async function main() {
  await mkdir(RUN_DIR, { recursive: true });

  console.log('[start] cleaning up any previous run...');
  await killSavedPids();
  await killStrayVitePreview();
  await new Promise((resolve) => setTimeout(resolve, 300));

  console.log(`[start] launching reference-server on ${HOST}:${REFERENCE_PORT}...`);
  const reference = spawnDetached(
    'reference-server',
    process.execPath,
    [path.join(__dirname, 'reference-server.mjs'), String(REFERENCE_PORT), HOST]
  );
  await writeFile(path.join(RUN_DIR, 'reference-server.pid'), String(reference.child.pid));

  console.log(`[start] launching mock-api-server on ${HOST}:${MOCK_API_PORT}...`);
  const mockApi = spawnDetached(
    'mock-api-server',
    process.execPath,
    [path.join(__dirname, 'mock-api-server.mjs'), String(MOCK_API_PORT), HOST]
  );
  await writeFile(path.join(RUN_DIR, 'mock-api-server.pid'), String(mockApi.child.pid));

  await waitForHttp(`http://${HOST}:${REFERENCE_PORT}/Market%20Brief%20v2.dc.html`);
  await waitForHttp(`${MOCK_API_ORIGIN}/stock/api/pages/daily/latest`);
  console.log('[start] reference-server and mock-api-server are up.');

  console.log(`[start] building candidate app with VITE_API_HOST=${MOCK_API_ORIGIN}...`);
  const buildExit = sh('pnpm', ['build'], {
    cwd: REPO_ROOT,
    env: { ...process.env, VITE_API_HOST: MOCK_API_ORIGIN },
  });
  if (buildExit !== 0) {
    console.error('[start] pnpm build failed — aborting before starting vite preview.');
    process.exitCode = 1;
    return;
  }

  console.log(`[start] launching vite preview (candidate) on ${HOST}:${CANDIDATE_PORT}...`);
  // NOT `pnpm preview -- --flags`: pnpm forwards a literal `--` into vite's
  // argv, which makes vite silently ignore every flag after it (binds
  // default `localhost`/IPv6 `::1`, ignores --strictPort). `pnpm exec vite
  // preview ...` (no `--` before vite's own flags) avoids that.
  const preview = spawnDetached(
    'vite-preview',
    'pnpm',
    [
      'exec',
      'vite',
      'preview',
      '--host',
      HOST,
      '--port',
      String(CANDIDATE_PORT),
      '--strictPort',
    ],
    { VITE_API_HOST: MOCK_API_ORIGIN }
  );
  await writeFile(path.join(RUN_DIR, 'vite-preview.pid'), String(preview.child.pid));

  await waitForHttp(CANDIDATE_BASE_URL);
  console.log(`[start] candidate is up at ${CANDIDATE_BASE_URL}`);

  console.log('[start] all servers running:');
  console.log(`  reference : http://${HOST}:${REFERENCE_PORT}/Market%20Brief%20v2.dc.html`);
  console.log(`  mock API  : ${MOCK_API_ORIGIN}`);
  console.log(`  candidate : ${CANDIDATE_BASE_URL}`);
  console.log('[start] tear down with: node .visual-audit/servers/stop.mjs');
}

main().catch((err) => {
  console.error('[start] failed:', err);
  process.exitCode = 1;
});
