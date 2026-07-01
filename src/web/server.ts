import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { AppConfig } from '../config.js';
import { ensureDir } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { loadOrCreateWebToken } from './auth.js';
import { registerApiProxy } from './proxy.js';

export async function startWebServer(params: {
  host: string;
  port: number;
  apiUrl: string;
  config: AppConfig;
  logger: Logger;
}): Promise<Server> {
  const webDir = params.config.webDataDir;
  await ensureDir(webDir);
  const token = await loadOrCreateWebToken(webDir);

  const app = express();
  app.use(express.static(staticDir()));
  registerApiProxy(app, { apiUrl: params.apiUrl, token });

  return app.listen(params.port, params.host, () => {
    params.logger.info(`Web UI listening on http://${params.host}:${params.port}`);
    params.logger.info(`Web UI proxying API requests to ${params.apiUrl}`);
    params.logger.info(`Web UI token URL: ${buildTokenUrl(params.host, params.port, token)}`);
  });
}

function buildTokenUrl(host: string, port: number, token: string): string {
  const urlHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  const url = new URL(`http://${hostForUrl(urlHost)}:${port}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

function hostForUrl(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

function staticDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const built = path.resolve(here, '..', '..', 'dist', 'web', 'static');
  const legacy = path.resolve(here, '..', '..', 'src', 'web', 'static');
  if (fs.existsSync(path.join(built, 'index.html'))) return built;
  return legacy;
}
