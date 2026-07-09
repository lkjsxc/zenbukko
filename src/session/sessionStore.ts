import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ensureDir, fileExists } from '../utils/fs.js';
import { writeJsonAtomic } from '../utils/atomic.js';

const CookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

const NewSessionSchema = z.object({
  savedAt: z.string(),
  userAgent: z.string().optional(),
  cookies: z.array(CookieSchema),
});

// Cookie-header import shape: { cookies: "a=b; c=d", created_at: "..." }
const CookieHeaderSessionSchema = z.object({
  cookies: z.string(),
  created_at: z.string().optional(),
});

const SessionSchema = z.union([NewSessionSchema, CookieHeaderSessionSchema]);

export type StoredCookie = z.infer<typeof CookieSchema>;
export type StoredSession =
  | z.infer<typeof NewSessionSchema>
  | {
      savedAt: string;
      userAgent?: string;
      cookies: StoredCookie[];
      cookieHeader: string;
    };

export class SessionStore {
  public constructor(private readonly sessionPath: string) {}

  async load(): Promise<StoredSession | null> {
    if (!(await fileExists(this.sessionPath))) return null;
    const raw = await fs.readFile(this.sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    const session = SessionSchema.parse(parsed);
    if ('savedAt' in session) {
      return session;
    }

    const cookieHeader = session.cookies;
    return {
      savedAt: session.created_at ?? new Date().toISOString(),
      cookies: parseCookieHeader(cookieHeader),
      cookieHeader,
    };
  }

  async save(session: StoredSession): Promise<void> {
    try {
      await ensureDir(path.dirname(this.sessionPath));
      await writeJsonAtomic(this.sessionPath, session, { mode: 0o600 });
    } catch (error) {
      throw buildSessionWriteError(this.sessionPath, error);
    }
  }
}

export function buildSessionWriteError(sessionPath: string, error: unknown): Error {
  if (isNodeFileError(error) && error.code === 'EACCES') {
    return new Error(
      [
        `Cannot write session file: ${sessionPath}`,
        'The data directory is not writable by the current user.',
        'If Docker created it as root, run:',
        `sudo chown -R "$(id -u):$(id -g)" ${path.dirname(sessionPath)}`,
      ].join('\n'),
      { cause: error },
    );
  }

  if (error instanceof Error) return error;
  return new Error(String(error));
}

export function parseStoredSession(value: unknown): StoredSession {
  const session = SessionSchema.parse(value);
  if ('savedAt' in session) return session;

  const cookieHeader = session.cookies;
  return {
    savedAt: session.created_at ?? new Date().toISOString(),
    cookies: parseCookieHeader(cookieHeader),
    cookieHeader,
  };
}

export function buildSessionPrefill(session: StoredSession | null): {
  exists: boolean;
  session: StoredSession | null;
  text: string;
} {
  if (!session) return { exists: false, session: null, text: '' };
  return { exists: true, session, text: JSON.stringify(session, null, 2) };
}

function domainMatches(cookieDomain: string, requestHost: string): boolean {
  const cd = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
  return requestHost === cd || requestHost.endsWith(`.${cd}`);
}

function pathMatches(cookiePath: string, requestPath: string): boolean {
  if (!requestPath.startsWith('/')) return false;
  if (!cookiePath.startsWith('/')) return false;
  if (cookiePath === '/') return true;
  return requestPath.startsWith(cookiePath);
}

export function buildCookieHeader(session: StoredSession, url: URL): string {
  if ('cookieHeader' in session && session.cookieHeader.trim()) {
    return session.cookieHeader;
  }

  const host = url.hostname;
  const pathname = url.pathname || '/';

  const nowSec = Date.now() / 1000;

  const pairs = session.cookies
    .filter((c) => {
      const domain = c.domain ?? host;
      const cookiePath = c.path ?? '/';
      const notExpired = c.expires === undefined || c.expires === -1 || c.expires > nowSec;
      return notExpired && domainMatches(domain, host) && pathMatches(cookiePath, pathname);
    })
    .map((c) => `${c.name}=${c.value}`);

  // Deduplicate by name; keep last occurrence (more specific cookies later in array)
  const byName = new Map<string, string>();
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    const name = idx >= 0 ? pair.slice(0, idx) : pair;
    byName.set(name, pair);
  }

  return Array.from(byName.values()).join('; ');
}

function parseCookieHeader(cookieHeader: string): StoredCookie[] {
  // Best-effort parsing of a Cookie header string.
  return cookieHeader
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      const name = idx >= 0 ? pair.slice(0, idx).trim() : pair.trim();
      const value = idx >= 0 ? pair.slice(idx + 1).trim() : '';
      return {
        name,
        value,
        domain: '.nnn.ed.nico',
        path: '/',
      };
    })
    .filter((c) => c.name.length > 0);
}

function isNodeFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
