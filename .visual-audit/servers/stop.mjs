#!/usr/bin/env node
/** Tears down everything `start.mjs` started. */
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIR = path.join(__dirname, '.run');

async function main() {
  for (const name of ['reference-server', 'mock-api-server', 'vite-preview']) {
    const pidFile = path.join(RUN_DIR, `${name}.pid`);
    try {
      const pid = Number((await readFile(pidFile, 'utf8')).trim());
      if (Number.isFinite(pid) && pid > 0) {
        process.kill(pid, 'SIGTERM');
        console.log(`[stop] killed ${name} (pid ${pid})`);
      }
    } catch {
      // No saved PID — nothing to kill for this one.
    }
    await rm(pidFile, { force: true });
  }

  spawnSync('pkill', ['-f', 'vite preview'], { stdio: 'ignore' });
  console.log('[stop] done.');
}

main();
