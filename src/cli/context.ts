import type { Command } from 'commander';
import { loadConfig, type AppConfig } from '../config.js';
import { Logger } from '../utils/log.js';

export type CliContext = {
  cfg: AppConfig;
  opts: Record<string, unknown>;
  logger: Logger;
  sessionPath: string;
  outputDir: string;
};

export function makeContext(program: Command): CliContext {
  const cfg = loadConfig();
  const opts = program.opts() as Record<string, unknown>;
  const logger = new Logger((opts.logLevel as AppConfig['logLevel'] | undefined) ?? cfg.logLevel);
  return {
    cfg,
    opts,
    logger,
    sessionPath: (opts.session as string | undefined) ?? cfg.sessionPath,
    outputDir: (opts.output as string | undefined) ?? cfg.outputDir,
  };
}

export function headlessFrom(ctx: CliContext): boolean {
  return (ctx.opts.headless as boolean | undefined) ?? ctx.cfg.puppeteerHeadless;
}

export function addRepeatedNumber(value: string, acc: number[]): number[] {
  acc.push(Number(value));
  return acc;
}
