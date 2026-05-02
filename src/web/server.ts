import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { AppConfig } from '../config.js';
import { ensureDir } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { registerWebRoutes } from './routes.js';
import { WebJobQueue } from './queue.js';

export async function startWebServer(params: {
  host: string;
  port: number;
  config: AppConfig;
  logger: Logger;
}): Promise<Server> {
  const webDir = path.join(path.dirname(params.config.sessionPath), 'web');
  await ensureDir(webDir);

  const queue = new WebJobQueue(params.config, webDir, params.logger);
  await queue.init();

  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(express.static(staticDir()));
  registerWebRoutes(app, { config: params.config, logger: params.logger, queue, webDir });

  return app.listen(params.port, params.host, () => {
    params.logger.info(`Web UI listening on http://${params.host}:${params.port}`);
  });
}

function staticDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fromSource = path.resolve(here, '..', '..', 'src', 'web', 'static');
  return fromSource;
}
