import express from 'express';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AppConfig } from '../config.js';
import { ensureDir } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { ApiJobQueue } from './queue.js';
import { registerApiRoutes } from './routes.js';

export async function startApiServer(params: {
  host: string;
  port: number;
  config: AppConfig;
  logger: Logger;
}): Promise<Server> {
  const stateDir = path.join(path.dirname(params.config.sessionPath), 'api');
  await ensureDir(stateDir);

  const queue = new ApiJobQueue(params.config, stateDir, params.logger);
  await queue.init();

  const app = express();
  app.use(express.json({ limit: '4mb' }));
  registerApiRoutes(app, { config: params.config, logger: params.logger, queue, stateDir });

  return app.listen(params.port, params.host, () => {
    params.logger.info(`Core API listening on http://${params.host}:${params.port}`);
  });
}
