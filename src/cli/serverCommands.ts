import type { Command } from 'commander';
import { startApiServer } from '../api/server.js';
import { startWebServer } from '../web/server.js';
import { makeContext } from './context.js';

export function registerServerCommands(program: Command): void {
  program.command('api')
    .description('Start the local Core API server')
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .option('--port <port>', 'Bind port', (v) => Number(v))
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await startApiServer({
        host: String(cmd.host ?? '127.0.0.1'),
        port: numberOption(cmd.port, ctx.cfg.apiPort),
        config: ctx.cfg,
        logger: ctx.logger,
      });
    });

  program.command('web')
    .description('Start the local Docker-friendly web UI')
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .option('--port <port>', 'Bind port', (v) => Number(v))
    .option('--api-url <url>', 'Core API base URL')
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await startWebServer({
        host: String(cmd.host ?? '127.0.0.1'),
        port: numberOption(cmd.port, ctx.cfg.webPort),
        apiUrl: String(cmd.apiUrl ?? ctx.cfg.apiUrl),
        config: ctx.cfg,
        logger: ctx.logger,
      });
    });
}

function numberOption(value: unknown, fallback: number): number {
  const port = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Port must be a whole number from 1 to 65535: ${port}`);
  }
  return port;
}
