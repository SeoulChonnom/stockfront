#!/usr/bin/env node
/**
 * Reference (design prototype) static HTTP server for the pixel-perfect-react-ui
 * visual-audit harness. Serves `docs/design_v2/handoff_v2/` — never modified,
 * only read — over plain HTTP so `support.js`'s `fetch(location.href)` works.
 *
 * Usage: `node reference-server.mjs [port] [host]`
 * Defaults: port 4795, host 127.0.0.1.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { startStaticServer } from './lib/static-file-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/design_v2/handoff_v2');

const port = Number(process.argv[2] ?? process.env.REFERENCE_PORT ?? 4795);
const host = process.argv[3] ?? '127.0.0.1';

startStaticServer(DESIGN_ROOT, port, host)
  .then(() => {
    console.log(`[reference-server] http://${host}:${port} -> ${DESIGN_ROOT}`);
  })
  .catch((err) => {
    console.error('[reference-server] failed to start:', err);
    process.exitCode = 1;
  });
