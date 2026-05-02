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
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    ZENBUKKO_OCR_MODE: z.enum(['auto', 'batch', 'flex']).optional(),
    ZENBUKKO_OCR_SERVICE_TIER: z.enum(['flex', 'standard']).optional(),
    ZENBUKKO_OCR_RETRIES: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_OCR_TIMEOUT_MS: z.string().optional().transform((v) => parseOptionalInt(v)),
    WEB_PORT: z
      .string()
      .optional()
      .transform((v) => {
        if (v === undefined || v.trim() === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : undefined;
      }),
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
  geminiApiKey?: string;
  geminiModel: string;
  ocrMode: 'auto' | 'batch' | 'flex';
  ocrServiceTier: 'flex' | 'standard';
  ocrRetries: number;
  ocrTimeoutMs: number;
  webPort: number;
};

export function loadConfig(): AppConfig {
  const env = EnvSchema.parse(process.env);

  const sessionPath = env.ZENBUKKO_SESSION_PATH ?? getDefaultSessionPath();
  const outputDir = env.OUTPUT_DIR ? path.resolve(env.OUTPUT_DIR) : path.resolve('data', 'downloads');
  const logLevel = env.LOG_LEVEL ?? 'info';
  const puppeteerHeadless = env.PUPPETEER_HEADLESS ?? false;
  const geminiModel = env.GEMINI_MODEL ?? 'gemini-3-flash-preview';
  const ocrMode = env.ZENBUKKO_OCR_MODE ?? 'auto';
  const ocrServiceTier = env.ZENBUKKO_OCR_SERVICE_TIER ?? 'flex';
  const ocrRetries = env.ZENBUKKO_OCR_RETRIES ?? 3;
  const ocrTimeoutMs = env.ZENBUKKO_OCR_TIMEOUT_MS ?? 900_000;
  const webPort = env.WEB_PORT ?? 8787;

  return {
    sessionPath,
    outputDir,
    logLevel,
    puppeteerHeadless,
    ...(env.GEMINI_API_KEY ? { geminiApiKey: env.GEMINI_API_KEY } : {}),
    geminiModel,
    ocrMode,
    ocrServiceTier,
    ocrRetries,
    ocrTimeoutMs,
    webPort,
  };
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
