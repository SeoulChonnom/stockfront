import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Minimal static file server for `docs/design_v2/handoff_v2/` — the design
 * prototype's `support.js` does `fetch(location.href)`, so it must be served
 * over real HTTP (`file://` fails). Deliberately independent of
 * `scripts/parity/lib/static-server.mjs` (same idea, not imported) so this
 * instrumentation has no coupling to the existing parity harness, which is
 * off-limits to modify per the task's hard constraints.
 */

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export function startStaticServer(rootDir, port, host = '127.0.0.1') {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${host}:${port}`);
      const decodedPath = decodeURIComponent(url.pathname);
      const relPath = decodedPath === '/' ? '/index.html' : decodedPath;
      const filePath = path.join(rootDir, relPath);

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      const ext = path.extname(filePath);
      const body = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        res.writeHead(404).end('Not found');
      } else {
        res.writeHead(500).end(String(err));
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}
