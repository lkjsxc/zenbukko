import type express from 'express';
import type { Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import { scrapeMyCoursesDetailed } from '../services/courseScraper.js';
import { buildSessionPrefill, parseStoredSession, SessionStore } from '../session/sessionStore.js';
import { fileExists, readTextFileIfExists } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { requireWebToken } from './auth.js';
import { listOutputs } from './outputs.js';
import { normalizeJobRequest } from './requests.js';
import type { WebJobQueue } from './queue.js';
import { getEffectiveWebSettings, saveWebSettings } from './settings.js';
import type { JobKind, JobRecord, PublicJob } from './types.js';

type RouteParams = { config: AppConfig; logger: Logger; queue: WebJobQueue; webDir: string; token: string };

export function registerWebRoutes(app: express.Express, params: RouteParams): void {
  const requireToken = requireWebToken(params.token);
  const requireEventToken = requireWebToken(params.token, { allowQueryToken: true });

  app.get('/', asyncHandler(async (_req, res) => {
    res.type('html').send(await readFile(path.join(process.cwd(), 'src', 'web', 'static', 'index.html'), 'utf8'));
  }));

  app.get('/api/status', asyncHandler(async (_req, res) => {
    res.json({
      sessionExists: await fileExists(params.config.sessionPath),
      outputDir: params.config.outputDir,
      geminiConfigured: Boolean((await getEffectiveWebSettings(params.config, params.webDir)).geminiApiKey),
      model: (await getEffectiveWebSettings(params.config, params.webDir)).geminiModel,
      authRequired: true,
    });
  }));

  app.get('/api/session', requireToken, asyncHandler(async (_req, res) => {
    res.json(buildSessionPrefill(await new SessionStore(params.config.sessionPath).load()));
  }));

  app.post('/api/session', requireToken, asyncHandler(async (req, res) => {
    const raw = typeof req.body?.session === 'string' ? JSON.parse(req.body.session) : req.body?.session;
    await new SessionStore(params.config.sessionPath).save(parseStoredSession(raw));
    res.json({ ok: true, sessionPath: params.config.sessionPath });
  }));

  app.get('/api/settings', requireToken, asyncHandler(async (_req, res) => {
    res.json({ settings: await getEffectiveWebSettings(params.config, params.webDir) });
  }));

  app.post('/api/settings', requireToken, asyncHandler(async (req, res) => {
    await saveWebSettings(params.webDir, req.body?.settings ?? req.body ?? {});
    res.json({ settings: await getEffectiveWebSettings(params.config, params.webDir) });
  }));

  app.get('/api/courses', requireToken, asyncHandler(async (_req, res) => {
    const session = await new SessionStore(params.config.sessionPath).load();
    if (!session) {
      res.status(404).json({ error: 'No session imported yet.' });
      return;
    }
    res.json({ courses: await scrapeMyCoursesDetailed({ session, headless: params.config.puppeteerHeadless }) });
  }));

  app.get('/api/jobs', requireToken, (_req, res) => res.json({ jobs: params.queue.list().map(publicJob) }));
  app.get('/api/jobs/:id', requireToken, asyncHandler(async (req, res) => sendJob(params.queue, req, res)));
  app.get('/api/jobs/:id/events', requireEventToken, asyncHandler(async (req, res) => streamJob(params.queue, req, res)));
  app.post('/api/jobs', requireToken, asyncHandler(async (req, res) => enqueueJob(params.queue, req, res)));
  app.get('/api/outputs', requireToken, asyncHandler(async (_req, res) => {
    res.json({ outputs: await listOutputs(params.config.outputDir) });
  }));
}

function publicJob(job: JobRecord): PublicJob {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    title: job.title,
    request: job.request,
    ...(job.error ? { error: job.error } : {}),
  };
}

async function sendJob(queue: WebJobQueue, req: Request, res: Response): Promise<void> {
  const job = queue.get(String(req.params.id ?? ''));
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json({ job: publicJob(job), log: (await readTextFileIfExists(job.logPath)) ?? '' });
}

async function streamJob(queue: WebJobQueue, req: Request, res: Response): Promise<void> {
  const job = queue.get(String(req.params.id ?? ''));
  if (!job) {
    res.status(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  for (const line of ((await readTextFileIfExists(job.logPath)) ?? '').split('\n').filter(Boolean)) {
    res.write(`data: ${JSON.stringify(line)}\n\n`);
  }
  const unsub = queue.subscribe(job.id, (line) => res.write(`data: ${JSON.stringify(line)}\n\n`));
  req.on('close', unsub);
}

async function enqueueJob(queue: WebJobQueue, req: Request, res: Response): Promise<void> {
  const kind = String(req.body?.kind ?? '') as JobKind;
  if (kind !== 'download' && kind !== 'download-all' && kind !== 'ocr-materials') {
    res.status(400).json({ error: 'Invalid job kind.' });
    return;
  }
  try {
    const job = await queue.enqueue(kind, normalizeJobRequest(kind, req.body ?? {}));
    res.status(201).json({ job: publicJob(job) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req, res) => void fn(req, res).catch((e) => {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  });
}
