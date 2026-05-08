import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

const SettingsSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  ocrBackend: z.enum(['local', 'gemini']).optional(),
  ocrMode: z.enum(['auto', 'batch', 'flex']).optional(),
  ocrServiceTier: z.enum(['flex', 'standard']).optional(),
  chapterRange: z.string().optional(),
  ocrRetries: z.number().int().min(0).optional(),
  ocrTimeoutMs: z.number().int().min(1).optional(),
  ndlocrCommand: z.string().optional(),
  ndlocrDevice: z.enum(['cpu', 'cuda']).optional(),
  ocrPageDpi: z.number().int().min(72).max(600).optional(),
  ocrKeepIntermediates: z.boolean().optional(),
  ndlocrEnableTcy: z.boolean().optional(),
});

export type WebSettings = z.infer<typeof SettingsSchema>;

export type EffectiveWebSettings = {
  geminiApiKey: string;
  geminiModel: string;
  ocrBackend: 'local' | 'gemini';
  ocrMode: 'auto' | 'batch' | 'flex';
  ocrServiceTier: 'flex' | 'standard';
  chapterRange: string;
  ocrRetries: number;
  ocrTimeoutMs: number;
  ndlocrCommand: string;
  ndlocrDevice: 'cpu' | 'cuda';
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
};

export async function loadWebSettings(webDir: string): Promise<WebSettings> {
  const raw = await readTextFileIfExists(settingsPath(webDir));
  if (!raw) return {};
  return SettingsSchema.parse(JSON.parse(raw));
}

export async function saveWebSettings(webDir: string, value: unknown): Promise<WebSettings> {
  const parsed = SettingsSchema.parse(value);
  await ensureDir(webDir);
  await fs.writeFile(settingsPath(webDir), JSON.stringify(parsed, null, 2), 'utf8');
  return parsed;
}

export async function getEffectiveWebSettings(cfg: AppConfig, webDir: string): Promise<EffectiveWebSettings> {
  return mergeWebSettings(cfg, await loadWebSettings(webDir));
}

export function mergeWebSettings(cfg: AppConfig, saved: WebSettings): EffectiveWebSettings {
  return {
    geminiApiKey: saved.geminiApiKey?.trim() || cfg.geminiApiKey || '',
    geminiModel: saved.geminiModel?.trim() || cfg.geminiModel,
    ocrBackend: saved.ocrBackend ?? cfg.ocrBackend,
    ocrMode: saved.ocrMode ?? cfg.ocrMode,
    ocrServiceTier: saved.ocrServiceTier ?? cfg.ocrServiceTier,
    chapterRange: saved.chapterRange?.trim() || '',
    ocrRetries: saved.ocrRetries ?? cfg.ocrRetries,
    ocrTimeoutMs: saved.ocrTimeoutMs ?? cfg.ocrTimeoutMs,
    ndlocrCommand: saved.ndlocrCommand?.trim() || cfg.ndlocrCommand,
    ndlocrDevice: saved.ndlocrDevice ?? cfg.ndlocrDevice,
    ocrPageDpi: saved.ocrPageDpi ?? cfg.ocrPageDpi,
    ocrKeepIntermediates: saved.ocrKeepIntermediates ?? cfg.ocrKeepIntermediates,
    ndlocrEnableTcy: saved.ndlocrEnableTcy ?? cfg.ndlocrEnableTcy,
  };
}

function settingsPath(webDir: string): string {
  return path.join(webDir, 'settings.json');
}
