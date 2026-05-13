import { randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

export const WEB_TOKEN_HEADER = 'X-Zenbukko-Token';

const TokenFileSchema = z.object({
  token: z.string().min(32),
  createdAt: z.string().optional(),
});

export async function loadOrCreateWebToken(webDir: string): Promise<string> {
  const saved = await loadSavedToken(webDir);
  if (saved) return saved;

  const token = randomBytes(32).toString('base64url');
  await ensureDir(webDir);
  await fs.writeFile(tokenPath(webDir), JSON.stringify({ token, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  return token;
}

export function requireWebToken(expectedToken: string, options: { allowQueryToken?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (hasValidToken(req, expectedToken, Boolean(options.allowQueryToken))) {
      next();
      return;
    }
    res.status(401).json({ error: 'Missing or invalid web token.' });
  };
}

export function hasValidToken(req: Request, expectedToken: string, allowQueryToken = false): boolean {
  const candidate = tokenFromRequest(req, allowQueryToken);
  return Boolean(candidate && tokensEqual(candidate, expectedToken));
}

async function loadSavedToken(webDir: string): Promise<string | null> {
  const raw = await readTextFileIfExists(tokenPath(webDir));
  if (!raw) return null;
  try {
    return TokenFileSchema.parse(JSON.parse(raw)).token;
  } catch {
    return null;
  }
}

function tokenFromRequest(req: Request, allowQueryToken: boolean): string | undefined {
  const header = req.get(WEB_TOKEN_HEADER);
  if (header) return header;
  if (!allowQueryToken) return undefined;
  return typeof req.query.token === 'string' ? req.query.token : undefined;
}

function tokensEqual(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

function tokenPath(webDir: string): string {
  return path.join(webDir, 'token.json');
}
