import type express from 'express';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { NnnClient } from '../services/nnnClient.js';
import { SessionStore } from '../session/sessionStore.js';

type CourseRouteParams = { config: AppConfig };

export function registerCourseRoutes(app: express.Express, params: CourseRouteParams): void {
  app.get('/api/courses/:courseId', asyncHandler(async (req, res) => {
    const courseId = parseCourseId(paramString(req.params.courseId));
    const session = await requireSession(params.config.sessionPath);
    const details = await new NnnClient(session).getCourseDetails(courseId);
    res.json({ courseId, title: details.title, chapters: details.chapters });
  }));

  app.get('/api/courses/:courseId/chapters/:chapterId', asyncHandler(async (req, res) => {
    const courseId = parseCourseId(paramString(req.params.courseId));
    const chapterId = parseChapterId(paramString(req.params.chapterId));
    const session = await requireSession(params.config.sessionPath);
    const details = await new NnnClient(session).getChapterDetails(courseId, chapterId);
    res.json({ id: chapterId, title: details.title, sections: details.sections });
  }));
}

async function requireSession(sessionPath: string) {
  const session = await new SessionStore(sessionPath).load();
  if (!session) throw new HttpError(404, 'No session imported yet.');
  return session;
}

function paramString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCourseId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) throw new HttpError(400, 'Invalid course ID.');
  return n;
}

function parseChapterId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) throw new HttpError(400, 'Invalid chapter ID.');
  return n;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req, res) => void fn(req, res).catch((e) => {
    if (e instanceof HttpError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    const message = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: message });
  });
}
