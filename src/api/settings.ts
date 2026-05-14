import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

const SettingsSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  ocrBackend: z.enum(['auto', 'local', 'gemini']).optional(),
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

export type ApiSettings = z.infer<typeof SettingsSchema>;

export type EffectiveApiSettings = {
  geminiApiKey: string;
  geminiModel: string;
  ocrBackend: 'auto' | 'local' | 'gemini';
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

export async function loadApiSettings(stateDir: string): Promise<ApiSettings> {
  const raw = await readTextFileIfExists(settingsPath(stateDir));
  if (!raw) return {};
  return SettingsSchema.parse(JSON.parse(raw));
}

export async function saveApiSettings(stateDir: string, value: unknown): Promise<ApiSettings> {
  const parsed = SettingsSchema.parse(value);
  await ensureDir(stateDir);
  await fs.writeFile(settingsPath(stateDir), JSON.stringify(parsed, null, 2), 'utf8');
  return parsed;
}

export async function getEffectiveApiSettings(cfg: AppConfig, stateDir: string): Promise<EffectiveApiSettings> {
  return mergeApiSettings(cfg, await loadApiSettings(stateDir));
}

export function mergeApiSettings(cfg: AppConfig, saved: ApiSettings): EffectiveApiSettings {
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

function settingsPath(stateDir: string): string {
  return path.join(stateDir, 'settings.json');
}
