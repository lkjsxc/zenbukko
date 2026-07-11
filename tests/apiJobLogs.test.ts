import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import type { AppConfig } from '../src/config.js';
import { registerApiRoutes } from '../src/api/routes.js';
import {
  JOB_LOG_HISTORY_TRUNCATED,
  JOB_LOG_LINE_TRUNCATED,
  MAX_JOB_LOG_EVENT_BYTES,
  MAX_JOB_LOG_REPLAY_BYTES,
  MAX_JOB_LOG_REPLAY_LINES,
  readJobLogTail,
  serializeJobLogEvent,
} from '../src/api/jobLogs.js';
import type { ApiJobQueue } from '../src/api/queue.js';
import type { JobRecord } from '../src/api/types.js';
import { Logger } from '../src/utils/log.js';

test('job log tails and SSE frames stay bounded', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-job-log-'));
  try {
    const logPath = path.join(root, 'job.log');
    const oversized = `start-${'x'.repeat(MAX_JOB_LOG_EVENT_BYTES * 2)}-end`;
    await fs.writeFile(logPath, `${'old line\n'.repeat(9000)}${oversized}\nlatest line\n`, 'utf8');

    const tail = await readJobLogTail(logPath);
    assert.equal(tail.lines[0], JOB_LOG_HISTORY_TRUNCATED);
    assert.match(tail.lines.join('\n'), new RegExp(JOB_LOG_LINE_TRUNCATED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(tail.lines[tail.lines.length - 1], 'latest line');
    assert.ok(tail.lines.length <= MAX_JOB_LOG_REPLAY_LINES + 1);
    assert.ok(Buffer.byteLength(tail.lines.join('\n')) <= MAX_JOB_LOG_REPLAY_BYTES);

    const event = `data: ${serializeJobLogEvent('\u0000'.repeat(MAX_JOB_LOG_EVENT_BYTES * 2))}\n\n`;
    assert.ok(Buffer.byteLength(event) <= MAX_JOB_LOG_EVENT_BYTES);
    assert.match(JSON.parse(event.slice(6, -2)) as string, /line truncated/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('job detail returns only the bounded log tail', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-job-log-route-'));
  try {
    const logPath = path.join(root, 'job.log');
    await fs.writeFile(logPath, `${'discarded\n'.repeat(9000)}latest line\n`, 'utf8');
    const job = jobFor(logPath);
    await withApi(job, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/jobs/${job.id}`);
      const body = await response.json() as { log: string };
      assert.equal(response.status, 200);
      assert.match(body.log, /Earlier log output omitted/);
      assert.match(body.log, /latest line/);
      assert.ok(Buffer.byteLength(body.log) <= MAX_JOB_LOG_REPLAY_BYTES);

      const stream = await fetch(`${baseUrl}/api/jobs/${job.id}/events`);
      assert.equal(stream.status, 200);
      assert(stream.body);
      const reader = stream.body.getReader();
      let replay = '';
      while (!replay.includes('latest line')) {
        const { done, value } = await reader.read();
        if (done) break;
        replay += new TextDecoder().decode(value, { stream: true });
      }
      await reader.cancel();
      assert.match(replay, /Earlier log output omitted/);
      assert.match(replay, /latest line/);
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function withApi(job: JobRecord, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-api-job-log-'));
  const app = express();
  app.use(express.json());
  registerApiRoutes(app, { config: configFor(root), logger: new Logger('silent'), queue: queueFor(job), stateDir: path.join(root, 'api') });
  const server = app.listen(0);
  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(root, { recursive: true, force: true });
  }
}

function jobFor(logPath: string): JobRecord {
  return { id: 'job-1', kind: 'download', status: 'succeeded', createdAt: '', updatedAt: '', title: 'Course', request: {}, logPath };
}

function queueFor(job: JobRecord): ApiJobQueue {
  return {
    list: () => [job],
    get: (id: string) => id === job.id ? job : undefined,
    subscribe: () => () => undefined,
  } as unknown as ApiJobQueue;
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
