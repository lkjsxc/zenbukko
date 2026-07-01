import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';
import { getDefaultSessionPath } from './utils/paths.js';

export type LocalOcrDevice = 'cpu' | 'cuda';

dotenv.config();

const EnvSchema = z
  .object({
    ZENBUKKO_SESSION_PATH: z.string().optional(),
    OUTPUT_DIR: z.string().optional(),
    LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).optional(),
    ZENBUKKO_NDLOCR_CMD: z.string().optional(),
    ZENBUKKO_NDLOCR_DEVICE: z.enum(['cpu', 'cuda']).optional(),
    ZENBUKKO_OCR_PAGE_DPI: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_OCR_KEEP_INTERMEDIATES: z.string().optional().transform((v) => parseOptionalBool(v)),
    ZENBUKKO_NDLOCR_ENABLE_TCY: z.string().optional().transform((v) => parseOptionalBool(v)),
    ZENBUKKO_API_PORT: z.string().optional().transform((v) => parseOptionalInt(v)),
    ZENBUKKO_API_URL: z.string().optional(),
    ZENBUKKO_WEB_DATA_DIR: z.string().optional(),
    WEB_PORT: z.string().optional().transform((v) => parseOptionalInt(v)),
    PUPPETEER_HEADLESS: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .passthrough();

export type AppConfig = {
  sessionPath: string;
  outputDir: string;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  puppeteerHeadless: boolean;
  ndlocrCommand: string;
  ndlocrDevice: LocalOcrDevice;
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
  webPort: number;
  apiPort: number;
  apiUrl: string;
  webDataDir: string;
};

export function loadConfig(): AppConfig {
  const env = EnvSchema.parse(process.env);
  return {
    sessionPath: env.ZENBUKKO_SESSION_PATH ?? getDefaultSessionPath(),
    outputDir: env.OUTPUT_DIR ? path.resolve(env.OUTPUT_DIR) : path.resolve('data', 'downloads'),
    logLevel: env.LOG_LEVEL ?? 'info',
    puppeteerHeadless: env.PUPPETEER_HEADLESS ?? false,
    ndlocrCommand: env.ZENBUKKO_NDLOCR_CMD?.trim() || 'ndlocr-lite',
    ndlocrDevice: env.ZENBUKKO_NDLOCR_DEVICE ?? 'cpu',
    ocrPageDpi: env.ZENBUKKO_OCR_PAGE_DPI ?? 300,
    ocrKeepIntermediates: env.ZENBUKKO_OCR_KEEP_INTERMEDIATES ?? false,
    ndlocrEnableTcy: env.ZENBUKKO_NDLOCR_ENABLE_TCY ?? true,
    webPort: env.WEB_PORT ?? 8787,
    apiPort: env.ZENBUKKO_API_PORT ?? 8788,
    apiUrl: env.ZENBUKKO_API_URL?.trim() || 'http://127.0.0.1:8788',
    webDataDir: path.resolve(env.ZENBUKKO_WEB_DATA_DIR ?? path.join('data', 'web-ui')),
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
