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

async function resolveCommand(command: string): Promise<string | undefined> {
  if (!command.trim()) return undefined;
  if (command.includes(path.sep)) return (await canExecute(command)) ? path.resolve(command) : undefined;
  return (await which(command)) ?? undefined;
}

async function canExecute(filePath: string): Promise<boolean> {
  return access(filePath, constants.X_OK).then(() => true).catch(() => false);
}
