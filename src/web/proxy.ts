import { Readable } from 'node:stream';
import type express from 'express';
import type { Request, Response } from 'express';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const MAX_BODY_BYTES = 4 * 1024 * 1024;

class ProxyBodyTooLargeError extends Error {}

export function registerApiProxy(app: express.Express, params: { apiUrl: string }): void {
  const apiUrl = normalizeApiUrl(params.apiUrl);
  app.use('/api', (req, res) => void proxy(req, res, apiUrl));
}

async function proxy(req: Request, res: Response, apiUrl: string): Promise<void> {
  try {
    const body = hasBody(req) ? await readBody(req) : undefined;
    const init: RequestInit = { method: req.method, headers: upstreamHeaders(req) };
    if (body) {
      init.body = body;
      init.duplex = 'half';
    }
    const upstream = await fetch(upstreamUrl(apiUrl, req), init);
    res.status(upstream.status);
    copyHeaders(upstream.headers, res);
    if (!upstream.body) {
      res.end();
      return;
    }
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    const status = error instanceof ProxyBodyTooLargeError ? 413 : 502;
    res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

export function normalizeApiUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API URL must use http or https.');
  if (url.username || url.password) throw new Error('API URL must not contain credentials.');
  url.pathname = url.pathname.replace(/\/$/, '');
  return url.toString();
}

export function upstreamUrl(apiUrl: string, req: Pick<Request, 'originalUrl'>): string {
  const base = new URL(apiUrl);
  const target = new URL(req.originalUrl, base);
  target.protocol = base.protocol;
  target.host = base.host;
  target.username = '';
  target.password = '';
  return target.toString();
}

function upstreamHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(name.toLowerCase()) || name.toLowerCase() === 'host') continue;
    if (Array.isArray(value)) headers.set(name, value.join(', '));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function copyHeaders(headers: Headers, res: Response): void {
  headers.forEach((value, name) => {
    if (!HOP_BY_HOP.has(name.toLowerCase())) res.setHeader(name, value);
  });
}

function hasBody(req: Request): boolean {
  return req.method !== 'GET' && req.method !== 'HEAD';
}

async function readBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new ProxyBodyTooLargeError('Proxy request body exceeds 4 MB.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
