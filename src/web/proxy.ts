import { request as httpRequest, type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type express from 'express';
import type { Request, Response } from 'express';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const MAX_BODY_BYTES = 4 * 1024 * 1024;

type UpstreamInit = { method: string; headers: Headers; body?: Buffer; signal: AbortSignal };

class ProxyBodyTooLargeError extends Error {}

export function registerApiProxy(app: express.Express, params: { apiUrl: string }): void {
  const apiUrl = normalizeApiUrl(params.apiUrl);
  app.use('/api', (req, res) => void proxy(req, res, apiUrl));
}

async function proxy(req: Request, res: Response, apiUrl: string): Promise<void> {
  const controller = new AbortController();
  const cancelUpstream = () => controller.abort();
  req.once('aborted', cancelUpstream);
  res.once('close', cancelUpstream);
  try {
    const body = hasBody(req) ? await readBody(req) : undefined;
    const headers = upstreamHeaders(req);
    if (body && !headers.has('content-length')) headers.set('content-length', String(body.length));
    const upstream = await requestWithRetry(upstreamUrl(apiUrl, req), {
      method: req.method,
      headers,
      ...(body ? { body } : {}),
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      upstream.destroy();
      return;
    }
    res.status(upstream.statusCode ?? 502);
    copyHeaders(upstream.headers, res);
    pipeUpstreamBody(upstream, res, controller);
  } catch (error) {
    if (controller.signal.aborted || res.writableEnded || res.destroyed) return;
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = error instanceof ProxyBodyTooLargeError ? 413 : 502;
    res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

async function requestWithRetry(url: string, init: UpstreamInit): Promise<IncomingMessage> {
  try {
    return await requestUpstream(url, init);
  } catch (error) {
    if (!isRetryable(init)) throw error;
    return requestUpstream(url, init);
  }
}

function requestUpstream(url: string, init: UpstreamInit): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)(
      target,
      { method: init.method, headers: Object.fromEntries(init.headers.entries()) },
      (response) => {
        cleanup();
        resolve(response);
      },
    );
    const abort = () => request.destroy();
    const cleanup = () => init.signal.removeEventListener('abort', abort);
    request.once('error', (error) => {
      cleanup();
      reject(error);
    });
    if (init.signal.aborted) {
      abort();
      reject(new Error('Upstream request cancelled.'));
      return;
    }
    init.signal.addEventListener('abort', abort, { once: true });
    request.end(init.body);
  });
}

function pipeUpstreamBody(upstream: IncomingMessage, res: Response, controller: AbortController): void {
  const endResponse = () => {
    controller.abort();
    if (!res.writableEnded && !res.destroyed) res.end();
  };
  res.once('close', () => upstream.destroy());
  upstream.once('aborted', endResponse);
  upstream.on('error', endResponse);
  upstream.pipe(res);
}

function isRetryable(init: UpstreamInit): boolean {
  return !init.signal.aborted && (init.method === 'GET' || init.method === 'HEAD');
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

function copyHeaders(headers: IncomingHttpHeaders, res: Response): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && !HOP_BY_HOP.has(name.toLowerCase())) res.setHeader(name, value);
  }
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
