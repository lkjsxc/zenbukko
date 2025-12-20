import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';
import { getDefaultSessionPath } from './utils/paths.js';

dotenv.config();

const EnvSchema = z
  .object({
    ZENBUKKO_SESSION_PATH: z.string().optional(),
    OUTPUT_DIR: z.string().optional(),
    LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).optional(),
    PUPPETEER_HEADLESS: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .passthrough();

export type AppConfig = {
  sessionPath: string;
  outputDir: string;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  puppeteerHeadless: boolean;
};

export function loadConfig(): AppConfig {
  const env = EnvSchema.parse(process.env);

  const sessionPath = env.ZENBUKKO_SESSION_PATH ?? getDefaultSessionPath();
  const outputDir = env.OUTPUT_DIR ? path.resolve(env.OUTPUT_DIR) : path.resolve('downloads');
  const logLevel = env.LOG_LEVEL ?? 'info';
  const puppeteerHeadless = env.PUPPETEER_HEADLESS ?? false;

  return { sessionPath, outputDir, logLevel, puppeteerHeadless };
}
