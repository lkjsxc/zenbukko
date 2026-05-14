import type express from 'express';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { scrapeMyCoursesDetailed } from '../services/courseScraper.js';
import { buildSessionPrefill, parseStoredSession, SessionStore } from '../session/sessionStore.js';
import { fileExists, readTextFileIfExists } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { listOutputs } from './outputs.js';
import { normalizeJobRequest } from './requests.js';
import type { ApiJobQueue } from './queue.js';
import { getEffectiveApiSettings, saveApiSettings } from './settings.js';
import type { JobKind, JobRecord, PublicJob } from './types.js';

type RouteParams = { config: AppConfig; logger: Logger; queue: ApiJobQueue; stateDir: string };

export function registerApiRoutes(app: express.Express, params: RouteParams): void {
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/api/status', asyncHandler(async (_req, res) => {
    const settings = await getEffectiveApiSettings(params.config, params.stateDir);
    res.json({
      sessionExists: await fileExists(params.config.sessionPath),
      outputDir: params.config.outputDir,
      geminiConfigured: Boolean(settings.geminiApiKey),
      model: settings.geminiModel,
      authRequired: true,
    });
  }));

  app.get('/api/session', asyncHandler(async (_req, res) => {
    res.json(buildSessionPrefill(await new SessionStore(params.config.sessionPath).load()));
  }));

  app.post('/api/session', asyncHandler(async (req, res) => {
    const raw = typeof req.body?.session === 'string' ? JSON.parse(req.body.session) : req.body?.session;
    await new SessionStore(params.config.sessionPath).save(parseStoredSession(raw));
    res.json({ ok: true, sessionPath: params.config.sessionPath });
  }));

  app.get('/api/settings', asyncHandler(async (_req, res) => {
    res.json({ settings: await getEffectiveApiSettings(params.config, params.stateDir) });
  }));

  app.post('/api/settings', asyncHandler(async (req, res) => {
    await saveApiSettings(params.stateDir, req.body?.settings ?? req.body ?? {});
    res.json({ settings: await getEffectiveApiSettings(params.config, params.stateDir) });
  }));

  app.get('/api/courses', asyncHandler(async (_req, res) => {
    const session = await new SessionStore(params.config.sessionPath).load();
    if (!session) {
      res.status(404).json({ error: 'No session imported yet.' });
      return;
    }
    res.json({ courses: await scrapeMyCoursesDetailed({ session, headless: params.config.puppeteerHeadless }) });
  }));

  app.get('/api/jobs', (_req, res) => res.json({ jobs: params.queue.list().map(publicJob) }));
  app.get('/api/jobs/:id', asyncHandler(async (req, res) => sendJob(params.queue, req, res)));
  app.get('/api/jobs/:id/events', asyncHandler(async (req, res) => streamJob(params.queue, req, res)));
  app.post('/api/jobs', asyncHandler(async (req, res) => enqueueJob(params.queue, req, res)));
  app.get('/api/outputs', asyncHandler(async (_req, res) => {
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

async function sendJob(queue: ApiJobQueue, req: Request, res: Response): Promise<void> {
  const job = queue.get(String(req.params.id ?? ''));
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json({ job: publicJob(job), log: (await readTextFileIfExists(job.logPath)) ?? '' });
}

async function streamJob(queue: ApiJobQueue, req: Request, res: Response): Promise<void> {
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

async function enqueueJob(queue: ApiJobQueue, req: Request, res: Response): Promise<void> {
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
