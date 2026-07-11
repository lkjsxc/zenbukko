import type express from 'express';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { scrapeMyCoursesDetailed } from '../services/courseScraper.js';
import { buildSessionPrefill, parseStoredSession, SessionStore } from '../session/sessionStore.js';
import { fileExists } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { registerCourseRoutes } from './courseRoutes.js';
import { registerOutputRoutes } from './outputRoutes.js';
import { normalizeJobRequest } from './requests.js';
import { preflightLocalOcr } from '../services/ocr/preflight.js';
import type { ApiJobQueue } from './queue.js';
import { getEffectiveApiSettings, saveApiSettings } from './settings.js';
import { readJobLogTail, serializeJobLogEvent } from './jobLogs.js';
import type { JobKind, JobRecord, PublicJob } from './types.js';

type RouteParams = { config: AppConfig; logger: Logger; queue: ApiJobQueue; stateDir: string };

export const API_COURSE_LIST_HEADLESS = true;

export function registerApiRoutes(app: express.Express, params: RouteParams): void {
  registerCourseRoutes(app, { config: params.config });
  registerOutputRoutes(app, { config: params.config });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/api/status', asyncHandler(async (_req, res) => {
    const settings = await getEffectiveApiSettings(params.config, params.stateDir);
    const localOcr = await preflightLocalOcr({
      command: settings.ndlocrCommand,
      device: settings.ndlocrDevice,
      pageDpi: settings.ocrPageDpi,
      keepIntermediates: settings.ocrKeepIntermediates,
      enableTcy: settings.ndlocrEnableTcy,
    });
    res.json({
      sessionExists: await fileExists(params.config.sessionPath),
      outputDir: params.config.outputDir,
      localOcr: {
        ok: localOcr.ok,
        command: settings.ndlocrCommand,
        device: settings.ndlocrDevice,
        diagnostics: localOcr.diagnostics,
      },
      authRequired: false,
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
    res.json({ courses: await scrapeMyCoursesDetailed({ session, headless: API_COURSE_LIST_HEADLESS }) });
  }));

  app.get('/api/jobs', (_req, res) => res.json({ jobs: params.queue.list().map(publicJob) }));
  app.get('/api/jobs/:id', asyncHandler(async (req, res) => sendJob(params.queue, req, res)));
  app.get('/api/jobs/:id/events', asyncHandler(async (req, res) => streamJob(params.queue, req, res)));
  app.post('/api/jobs', asyncHandler(async (req, res) => enqueueJob(params.queue, req, res)));
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
  res.json({ job: publicJob(job), log: (await readJobLogTail(job.logPath)).lines.join('\n') });
}

async function streamJob(queue: ApiJobQueue, req: Request, res: Response): Promise<void> {
  const job = queue.get(String(req.params.id ?? ''));
  if (!job) {
    res.status(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  let closed = false;
  let unsub: (() => void) | null = null;
  const close = (): void => {
    if (closed) return;
    closed = true;
    unsub?.();
    if (!res.writableEnded) res.end();
  };
  req.once('close', close);

  const replay = (await readJobLogTail(job.logPath)).lines.map((line) => `data: ${serializeJobLogEvent(line)}\n\n`).join('');
  if (closed) return;
  if (replay) res.write(replay);
  if (closed) return;
  unsub = queue.subscribe(job.id, (line) => {
    if (!res.write(`data: ${serializeJobLogEvent(line)}\n\n`)) close();
  });
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
