import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import type { AppConfig } from '../src/config.js';
import { registerCourseRoutes } from '../src/api/courseRoutes.js';
import { SessionStore } from '../src/session/sessionStore.js';

test('course detail route returns 404 without session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-course-route-'));
  const app = express();
  registerCourseRoutes(app, { config: configFor(root) });
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/courses/123`);
    assert.equal(res.status, 404);
  });
});

test('course detail route returns chapters with saved session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-course-route-'));
  await new SessionStore(path.join(root, 'session.json')).save({
    savedAt: new Date().toISOString(),
    cookies: [{ name: 'a', value: 'b', domain: '.nnn.ed.nico', path: '/' }],
  });

  const app = express();
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('127.0.0.1') || url.includes('localhost')) return original(input, init);
    return new Response(JSON.stringify({ course: { title: 'Course', chapters: [{ id: 10, title: 'Intro', order: 1 }] } }), { status: 200 });
  };

  registerCourseRoutes(app, { config: configFor(root) });
  try {
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/courses/123`);
      assert.equal(res.status, 200);
      const body = await res.json() as { courseId: number; chapters: Array<{ id: number }> };
      assert.equal(body.courseId, 123);
      assert.equal(body.chapters[0]?.id, 10);
    });
  } finally {
    globalThis.fetch = original;
  }
});

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
