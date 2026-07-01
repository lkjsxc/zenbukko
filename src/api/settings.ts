import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AppConfig, LocalOcrDevice } from '../config.js';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

const SettingsSchema = z.object({
  chapterRange: z.string().optional(),
  ndlocrCommand: z.string().optional(),
  ndlocrDevice: z.enum(['cpu', 'cuda']).optional(),
  ocrPageDpi: z.number().int().min(72).max(600).optional(),
  ocrKeepIntermediates: z.boolean().optional(),
  ndlocrEnableTcy: z.boolean().optional(),
});

export type ApiSettings = z.infer<typeof SettingsSchema>;

export type EffectiveApiSettings = {
  chapterRange: string;
  ndlocrCommand: string;
  ndlocrDevice: LocalOcrDevice;
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
    chapterRange: saved.chapterRange?.trim() || '',
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
