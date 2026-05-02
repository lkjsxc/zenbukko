import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

const SettingsSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  ocrMode: z.enum(['auto', 'batch', 'flex']).optional(),
  ocrServiceTier: z.enum(['flex', 'standard']).optional(),
  chapterRange: z.string().optional(),
  ocrRetries: z.number().int().min(0).optional(),
  ocrTimeoutMs: z.number().int().min(1).optional(),
});

export type WebSettings = z.infer<typeof SettingsSchema>;

export type EffectiveWebSettings = Required<Omit<WebSettings, 'geminiApiKey' | 'chapterRange'>> & {
  geminiApiKey: string;
  chapterRange: string;
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
    ocrMode: saved.ocrMode ?? cfg.ocrMode,
    ocrServiceTier: saved.ocrServiceTier ?? cfg.ocrServiceTier,
    chapterRange: saved.chapterRange?.trim() || '',
    ocrRetries: saved.ocrRetries ?? cfg.ocrRetries,
    ocrTimeoutMs: saved.ocrTimeoutMs ?? cfg.ocrTimeoutMs,
  };
}

function settingsPath(webDir: string): string {
  return path.join(webDir, 'settings.json');
}
