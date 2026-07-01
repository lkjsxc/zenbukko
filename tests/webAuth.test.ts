import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import type { AppConfig } from '../src/config.js';
import { registerApiRoutes } from '../src/api/routes.js';
import type { ApiJobQueue } from '../src/api/queue.js';
import type { JobRecord } from '../src/api/types.js';
import { loadOrCreateWebToken, WEB_TOKEN_HEADER } from '../src/web/auth.js';
import { registerApiProxy } from '../src/web/proxy.js';
import { Logger } from '../src/utils/log.js';

const token = 'test-token-that-is-long-enough-for-route-auth';

test('web token is generated under web data dir and reused', async () => {
  const webDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-web-token-'));
  const first = await loadOrCreateWebToken(webDir);
  const second = await loadOrCreateWebToken(webDir);
  const raw = JSON.parse(await fs.readFile(path.join(webDir, 'token.json'), 'utf8')) as { token: string };

  assert.equal(first, second);
  assert.equal(raw.token, first);
  assert.ok(first.length >= 32);
});

test('Core API exposes healthz without web auth', async () => {
  await withApiRoutes(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test('web proxy leaves status public and preserves browser API shape', async () => {
  await withProxy(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/status`);
    const body = await res.json() as { authRequired?: boolean; model?: string };

    assert.equal(res.status, 200);
    assert.equal(body.authRequired, true);
    assert.equal(body.model, 'model');
  });
});

test('sensitive web APIs require X-Zenbukko-Token before proxying', async () => {
  await withProxy(async (baseUrl) => {
    for (const endpoint of ['/api/session', '/api/settings', '/api/courses', '/api/courses/1', '/api/jobs', '/api/outputs']) {
      assert.equal((await fetch(`${baseUrl}${endpoint}`)).status, 401);
    }

    const allowed = await fetch(`${baseUrl}/api/settings`, { headers: { [WEB_TOKEN_HEADER]: token } });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), { settings: { ok: true } });
  });
});

test('authorized JSON requests proxy to Core API unchanged', async () => {
  await withProxy(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [WEB_TOKEN_HEADER]: token },
      body: JSON.stringify({ settings: { geminiModel: 'proxy-model' } }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: { settings: { geminiModel: 'proxy-model' } } });
  });
});

test('job event stream accepts token query parameter for SSE', async () => {
  await withProxy(async (baseUrl) => {
    const denied = await fetch(`${baseUrl}/api/jobs/job-1/events`);
    const allowed = await fetch(`${baseUrl}/api/jobs/job-1/events?token=${encodeURIComponent(token)}`);

    assert.equal(denied.status, 401);
    assert.equal(allowed.status, 200);
    assert.match(await allowed.text(), /data: "line one"/);
  });
});

async function withProxy(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const api = express();
  api.use(express.json());
  api.get('/api/status', (_req, res) => res.json({ authRequired: true, model: 'model' }));
  api.get('/api/settings', (_req, res) => res.json({ settings: { ok: true } }));
  api.post('/api/settings', (req, res) => res.json({ received: req.body }));
  for (const p of ['/api/session', '/api/courses', '/api/jobs', '/api/outputs']) api.get(p, (_req, res) => res.json({ ok: true }));
  api.get('/api/jobs/job-1/events', (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: "line one"\n\n');
  });

  await withServer(api, async (apiUrl) => {
    const web = express();
    registerApiProxy(web, { apiUrl, token });
    await withServer(web, run);
  });
}

async function withApiRoutes(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-api-routes-'));
  const app = express();
  app.use(express.json());
  registerApiRoutes(app, { config: configFor(root), logger: new Logger('silent'), queue: queueFor(), stateDir: path.join(root, 'api') });
  await withServer(app, run);
}

async function withServer(app: express.Express, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

function configFor(root: string): AppConfig {
  return {
    sessionPath: path.join(root, 'session.json'),
    outputDir: path.join(root, 'downloads'),
    logLevel: 'silent',
    puppeteerHeadless: true,
    geminiModel: 'model',
    ocrBackend: 'local',
    ocrMode: 'auto',
    ocrServiceTier: 'flex',
    ocrRetries: 3,
    ocrTimeoutMs: 900_000,
    ndlocrCommand: 'ndlocr-lite',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 200,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: false,
    webPort: 8787,
    apiPort: 8788,
    apiUrl: 'http://127.0.0.1:8788',
    webDataDir: path.join(root, 'web-ui'),
  };
}

function queueFor(job?: JobRecord): ApiJobQueue {
  return {
    list: () => job ? [job] : [],
    get: (id: string) => job?.id === id ? job : undefined,
    subscribe: () => () => undefined,
  } as unknown as ApiJobQueue;
}
