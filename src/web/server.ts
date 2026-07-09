import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { AppConfig } from '../config.js';
import { ensureDir } from '../utils/fs.js';
import { listen } from '../utils/listen.js';
import type { Logger } from '../utils/log.js';
import { registerApiProxy } from './proxy.js';

export async function startWebServer(params: {
  host: string;
  port: number;
  apiUrl: string;
  config: AppConfig;
  logger: Logger;
}): Promise<Server> {
  await ensureDir(params.config.webDataDir);
  const assets = staticDir();
  const app = express();
  app.use(express.static(assets));
  registerApiProxy(app, { apiUrl: params.apiUrl });

  const server = await listen(app, params.port, params.host, 'Web UI');
  params.logger.info(`Web UI listening on http://${params.host}:${params.port}`);
  params.logger.info(`Web UI proxying API requests to ${params.apiUrl}`);
  if (!isLoopback(params.host)) params.logger.warn('Web UI is exposed beyond loopback. Use only a trusted network or external access control.');
  return server;
}

export function staticDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const built = path.resolve(here, '..', '..', 'dist', 'web', 'static');
  if (fs.existsSync(path.join(built, 'index.html'))) return built;
  throw new Error('Web UI assets are missing. Install web-ui dependencies and run the build before starting Web.');
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}
