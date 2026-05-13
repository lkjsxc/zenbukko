import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import type { AppConfig } from '../src/config.js';
import { loadOrCreateWebToken, WEB_TOKEN_HEADER } from '../src/web/auth.js';
import { registerWebRoutes } from '../src/web/routes.js';
import type { WebJobQueue } from '../src/web/queue.js';
import type { JobRecord } from '../src/web/types.js';
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

test('status is public and reports web auth requirement', async () => {
  await withApp(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/status`);
    const body = await res.json() as { authRequired?: boolean };

    assert.equal(res.status, 200);
    assert.equal(body.authRequired, true);
  });
});

test('sensitive web APIs require X-Zenbukko-Token', async () => {
  await withApp(async (baseUrl) => {
    for (const endpoint of ['/api/session', '/api/settings', '/api/courses', '/api/jobs', '/api/outputs']) {
      const denied = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(denied.status, 401);
    }

    const allowed = await fetch(`${baseUrl}/api/settings`, { headers: { [WEB_TOKEN_HEADER]: token } });
    assert.equal(allowed.status, 200);
  });
});

test('job event stream accepts token query parameter for SSE', async () => {
  const job = await makeJob();
  await withApp(async (baseUrl) => {
    const denied = await fetch(`${baseUrl}/api/jobs/${job.id}/events`);
    const allowed = await fetch(`${baseUrl}/api/jobs/${job.id}/events?token=${encodeURIComponent(token)}`);

    assert.equal(denied.status, 401);
    assert.equal(allowed.status, 200);
    await allowed.body?.cancel();
  }, job);
});

async function withApp(run: (baseUrl: string) => Promise<void>, job?: JobRecord): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-web-routes-'));
  const app = express();
  app.use(express.json());
  registerWebRoutes(app, {
    config: configFor(root),
    logger: new Logger('silent'),
    queue: queueFor(job),
    webDir: path.join(root, 'web'),
    token,
  });

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
  };
}

function queueFor(job?: JobRecord): WebJobQueue {
  return {
    list: () => job ? [job] : [],
    get: (id: string) => job?.id === id ? job : undefined,
    subscribe: () => () => undefined,
  } as unknown as WebJobQueue;
}

async function makeJob(): Promise<JobRecord> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-web-job-'));
  const logPath = path.join(root, 'job.log');
  await fs.writeFile(logPath, 'line one\n', 'utf8');
  const now = new Date().toISOString();
  return { id: 'job-1', kind: 'download', status: 'running', createdAt: now, updatedAt: now, title: 'Job', request: {}, logPath };
}
