#!/usr/bin/env node
/**
 * Real HTTP mock API server for the pixel-perfect-react-ui visual-audit
 * harness's candidate (React app) side.
 *
 * WHY THIS EXISTS: the skill's `visual-audit.mjs` runner has no
 * route-interception hook (it only supports Playwright `storageState` /
 * `extraHttpHeaders` on the candidate context) — unlike `e2e/fixtures/
 * mock-api.ts#installMockApi`, which intercepts requests in-process via
 * `page.route()`. A plain `page.goto()` against the built app would hit a
 * real (nonexistent) backend and render error states. This server is a
 * real, independently-bindable HTTP endpoint the built app's
 * `VITE_API_HOST` can point at instead.
 *
 * This is NOT a fork of the fixture data. Every response body is produced
 * by calling the SAME factory functions `e2e/fixtures/mock-api.ts` exports
 * (`pageFixture`, `archiveFixture`, `clusterFixture`, `batchListFixture`,
 * `batchDetailFixture`, `triggerResult`, `shiftDate`) — imported directly
 * from that file (Node 24 strips TypeScript syntax at runtime, so no build
 * step is needed; the file's only non-erased dependency, `@playwright/test`,
 * is imported there as a type-only `import type`, which is elided entirely
 * and never touches this process). Only the request-routing/response-
 * envelope plumbing is reimplemented here, using plain `node:http` instead
 * of `page.route()`, because that plumbing is what needs to run as a real
 * server rather than as in-page interception.
 *
 * Route table mirrors `installMockApi` in that file exactly:
 *   POST /api/users/token                         (auth bootstrap)
 *   GET  /stock/api/pages/daily/latest
 *   GET  /stock/api/pages/daily?businessDate=
 *   GET  /stock/api/pages/:pageId
 *   GET  /stock/api/pages/archive?page&size&status
 *   GET  /stock/api/news/clusters/:id
 *   GET  /stock/api/batch/jobs?page&size&status
 *   GET  /stock/api/batch/jobs/:jobId
 *   POST /stock/api/batch/market-daily
 *   (anything else under /stock/api/**) -> 404 MOCK_ROUTE_NOT_FOUND
 *
 * Scenario is pinned to 'ready' (scenario='ready', archiveSearchMode=
 * 'results', role='admin') — the visual-audit harness always wants the
 * fully-populated happy path, matching the design prototype's own default
 * (`?mock=` omitted -> 'ready') per `docs/design_v2/handoff_v2/README.md`
 * and `scripts/parity/matrix.mjs`. `role: 'admin'` is required, not
 * decorative: `src/lib/capabilities.ts#getRole()` reads the token
 * response's `roleList`, and the ops/batches screen 403s a non-admin role
 * client-side (`PermissionState`) before ever rendering — the task brief's
 * "role operator" (the design's name for the app's `admin`) default
 * requires this.
 *
 * CORS: the candidate is served by `vite preview` on a DIFFERENT origin
 * than this server (the task brief is explicit: point `VITE_API_HOST`
 * directly at this server, not at a same-origin proxy). `apiRequest()`
 * (`src/lib/api/client.ts`) attaches an `Authorization` header to every
 * `/stock/api/**` call, which is not CORS-safelisted and forces a
 * preflight `OPTIONS` — handled below for every path. The token endpoint
 * fetch uses `credentials: 'include'`, which requires an exact
 * `Access-Control-Allow-Origin` (not `*`) plus
 * `Access-Control-Allow-Credentials: true` — this server echoes the
 * request's `Origin` header for both reasons.
 *
 * Usage: `node mock-api-server.mjs [port] [host]`
 * Defaults: port 4796, host 127.0.0.1.
 */
import { createServer } from 'node:http';

import {
  archiveFixture,
  batchDetailFixture,
  batchListFixture,
  clusterFixture,
  pageFixture,
  shiftDate,
  triggerResult,
} from '../../e2e/fixtures/mock-api.ts';

const PORT = Number(process.argv[2] ?? process.env.MOCK_API_PORT ?? 4796);
const HOST = process.argv[3] ?? '127.0.0.1';

const LATEST_BUSINESS_DATE = '2026-07-26';
const SCENARIO_PAGE_MODE = 'ready';
const CLUSTER_MODE = 'ready';
const ROLE_LIST = ['USER', 'ADMIN'];

function envelope(data) {
  return {
    success: true,
    data,
    meta: { requestId: 'req-visual-audit-mock', timestamp: '2026-07-27T08:24:31' },
  };
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function queryNumber(url, key, fallback) {
  const raw = url.searchParams.get(key);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function serverErrorEnvelope() {
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '서버가 요청을 처리하지 못했습니다.' },
  };
}

const server = createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  try {
    if (method === 'POST' && pathname === '/api/users/token') {
      sendJson(res, 200, {
        accessToken: 'visual-audit-mock-access-token',
        username: 'visual.audit',
        name: 'Visual Audit',
        roleList: ROLE_LIST,
      });
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/pages/daily/latest') {
      sendJson(res, 200, envelope(pageFixture(SCENARIO_PAGE_MODE, LATEST_BUSINESS_DATE)));
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/pages/daily') {
      const businessDate = url.searchParams.get('businessDate') ?? LATEST_BUSINESS_DATE;
      sendJson(res, 200, envelope(pageFixture(SCENARIO_PAGE_MODE, businessDate)));
      return;
    }

    const pageIdMatch = /^\/stock\/api\/pages\/(\d+)$/.exec(pathname);
    if (method === 'GET' && pageIdMatch) {
      const pageId = Number(pageIdMatch[1]);
      const businessDate = shiftDate('2026-07-26', pageId - 501);
      sendJson(res, 200, envelope(pageFixture(SCENARIO_PAGE_MODE, businessDate)));
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/pages/archive') {
      const page = queryNumber(url, 'page', 1);
      const size = queryNumber(url, 'size', 20);
      const status = url.searchParams.get('status') ?? '';
      sendJson(res, 200, envelope(archiveFixture('ready', page, size, status)));
      return;
    }

    const clusterMatch = /^\/stock\/api\/news\/clusters\/([^/]+)$/.exec(pathname);
    if (method === 'GET' && clusterMatch) {
      sendJson(res, 200, envelope(clusterFixture(CLUSTER_MODE, clusterMatch[1])));
      return;
    }

    if (method === 'GET' && pathname === '/stock/api/batch/jobs') {
      const page = queryNumber(url, 'page', 1);
      const size = queryNumber(url, 'size', 20);
      const status = url.searchParams.get('status') ?? '';
      sendJson(res, 200, envelope(batchListFixture('ready', page, size, status)));
      return;
    }

    const batchJobIdMatch = /^\/stock\/api\/batch\/jobs\/(\d+)$/.exec(pathname);
    if (method === 'GET' && batchJobIdMatch) {
      const jobId = Number(batchJobIdMatch[1]);
      sendJson(res, 200, envelope(batchDetailFixture(jobId)));
      return;
    }

    if (method === 'POST' && pathname === '/stock/api/batch/market-daily') {
      const body = await readJsonBody(req);
      const requestedBusinessDate =
        body && typeof body.businessDate === 'string' ? body.businessDate : undefined;
      const result = triggerResult('success', requestedBusinessDate);
      if ('error' in result) {
        sendJson(res, result.error.http, { success: false, error: result.error });
        return;
      }
      sendJson(res, 200, envelope(result.data));
      return;
    }

    if (pathname.startsWith('/stock/api/')) {
      sendJson(res, 404, {
        success: false,
        error: {
          code: 'MOCK_ROUTE_NOT_FOUND',
          message: `No mock handler for ${method} ${pathname}`,
        },
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error('[mock-api-server] request handler error:', err);
    sendJson(res, 500, serverErrorEnvelope());
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-api-server] http://${HOST}:${PORT}`);
});
