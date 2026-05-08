import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';
import { DEFAULT_GEMINI_MODEL } from './geminiDefaults.js';
import { getDefaultSessionPath } from './utils/paths.js';

dotenv.config();

const EnvSchema = z
  .object({
    ZENBUKKO_SESSION_PATH: z.string().optional(),
    OUTPUT_DIR: z.string().optional(),
    LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    ZENBUKKO_OCR_BACKEND: z.enum(['local', 'gemini']).optional(),
    ZENBUKKO_OCR_MODE: z.enum(['auto', 'batch', 'flex']).optional(),
    ZENBUKKO_OCR_SERVICE_TIER: z.enum(['flex', 'standard']).optional(),
    ZENBUKKO_OCR_RETRIES: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_OCR_TIMEOUT_MS: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_NDLOCR_CMD: z.string().optional(),
    ZENBUKKO_NDLOCR_DEVICE: z.enum(['cpu', 'cuda']).optional(),
    ZENBUKKO_OCR_PAGE_DPI: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_OCR_KEEP_INTERMEDIATES: z.string().optional().transform((v) => parseOptionalBool(v)),
    ZENBUKKO_NDLOCR_ENABLE_TCY: z.string().optional().transform((v) => parseOptionalBool(v)),
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
  ocrBackend: 'local' | 'gemini';
  ocrMode: 'auto' | 'batch' | 'flex';
  ocrServiceTier: 'flex' | 'standard';
  ocrRetries: number;
  ocrTimeoutMs: number;
  ndlocrCommand: string;
  ndlocrDevice: 'cpu' | 'cuda';
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
  webPort: number;
};

export function loadConfig(): AppConfig {
  const env = EnvSchema.parse(process.env);

  const sessionPath = env.ZENBUKKO_SESSION_PATH ?? getDefaultSessionPath();
  const outputDir = env.OUTPUT_DIR ? path.resolve(env.OUTPUT_DIR) : path.resolve('data', 'downloads');
  const logLevel = env.LOG_LEVEL ?? 'info';
  const puppeteerHeadless = env.PUPPETEER_HEADLESS ?? false;
  const geminiModel = env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const ocrBackend = env.ZENBUKKO_OCR_BACKEND ?? 'local';
  const ocrMode = env.ZENBUKKO_OCR_MODE ?? 'auto';
  const ocrServiceTier = env.ZENBUKKO_OCR_SERVICE_TIER ?? 'flex';
  const ocrRetries = env.ZENBUKKO_OCR_RETRIES ?? 3;
  const ocrTimeoutMs = env.ZENBUKKO_OCR_TIMEOUT_MS ?? 900_000;
  const ndlocrCommand = env.ZENBUKKO_NDLOCR_CMD?.trim() || 'ndlocr-lite';
  const ndlocrDevice = env.ZENBUKKO_NDLOCR_DEVICE ?? 'cpu';
  const ocrPageDpi = env.ZENBUKKO_OCR_PAGE_DPI ?? 200;
  const ocrKeepIntermediates = env.ZENBUKKO_OCR_KEEP_INTERMEDIATES ?? false;
  const ndlocrEnableTcy = env.ZENBUKKO_NDLOCR_ENABLE_TCY ?? false;
  const webPort = env.WEB_PORT ?? 8787;

  return {
    sessionPath,
    outputDir,
    logLevel,
    puppeteerHeadless,
    ...(env.GEMINI_API_KEY ? { geminiApiKey: env.GEMINI_API_KEY } : {}),
    geminiModel,
    ocrBackend,
    ocrMode,
    ocrServiceTier,
    ocrRetries,
    ocrTimeoutMs,
    ndlocrCommand,
    ndlocrDevice,
    ocrPageDpi,
    ocrKeepIntermediates,
    ndlocrEnableTcy,
    webPort,
  };
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function parseOptionalBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  if (/^(1|true|yes|on)$/i.test(value)) return true;
  if (/^(0|false|no|off)$/i.test(value)) return false;
  return undefined;
}
