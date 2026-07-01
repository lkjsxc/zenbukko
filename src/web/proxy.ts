import { Readable } from 'node:stream';
import type express from 'express';
import type { Request, Response } from 'express';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);

export function registerApiProxy(app: express.Express, params: { apiUrl: string }): void {
  app.use('/api', (req, res) => void proxy(req, res, params.apiUrl));
}

async function proxy(req: Request, res: Response, apiUrl: string): Promise<void> {
  try {
    const body = hasBody(req) ? await readBody(req) : undefined;
    const init: RequestInit = {
      method: req.method,
      headers: upstreamHeaders(req),
    };
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
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

function upstreamUrl(apiUrl: string, req: Request): string {
  const base = new URL(apiUrl);
  const target = new URL(req.originalUrl, base);
  target.protocol = base.protocol;
  target.host = base.host;
  target.username = base.username;
  target.password = base.password;
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
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
