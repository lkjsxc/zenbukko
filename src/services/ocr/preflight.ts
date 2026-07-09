import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { which } from '../../utils/which.js';
import type { LocalOcrPreflight, LocalOcrSettings, OcrDiagnostic } from './types.js';

export async function preflightLocalOcr(settings: LocalOcrSettings): Promise<LocalOcrPreflight> {
  const [pdftoppmPath, ocrCommandPath] = await Promise.all([
    resolveCommand('pdftoppm'),
    resolveCommand(settings.command),
  ]);
  const diagnostics: OcrDiagnostic[] = [];
  if (!pdftoppmPath) {
    diagnostics.push({
      code: 'missing-pdftoppm',
      message: 'Local OCR requires pdftoppm. Install Poppler tools and retry.',
    });
  }
  if (!ocrCommandPath) {
    diagnostics.push({
      code: 'missing-ocr-command',
      message: `Local OCR command not found: ${settings.command}. Install NDLOCR-Lite or set ZENBUKKO_NDLOCR_CMD.`,
    });
  }
  if (settings.device === 'cuda' && ocrCommandPath) {
    diagnostics.push({
      code: 'unexpected-local-ocr-error',
      message: 'CUDA OCR requires a Linux NVIDIA host and a CUDA-capable local OCR command.',
    });
  }
  return {
    ok: diagnostics.filter((d) => d.code !== 'unexpected-local-ocr-error').length === 0,
    ...(pdftoppmPath ? { pdftoppmPath } : {}),
    ...(ocrCommandPath ? { ocrCommandPath } : {}),
    diagnostics,
  };
}

export async function resolveCommand(command: string): Promise<string | undefined> {
  const trimmed = command.trim();
  if (!trimmed) return undefined;
  if (path.isAbsolute(trimmed) || trimmed.includes('/') || trimmed.includes('\\')) {
    return (await canExecute(trimmed)) ? path.resolve(trimmed) : undefined;
  }
  return (await which(trimmed)) ?? undefined;
}

async function canExecute(filePath: string): Promise<boolean> {
  const mode = process.platform === 'win32' ? constants.F_OK : constants.X_OK;
  return access(filePath, mode).then(() => true).catch(() => false);
}
