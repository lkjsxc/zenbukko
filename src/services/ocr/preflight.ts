import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { which } from '../../utils/which.js';
import type { LocalOcrPreflight, LocalOcrSettings, OcrDiagnostic } from './types.js';

export type PreflightRuntime = {
  platform: NodeJS.Platform;
  resolveCommand: (command: string) => Promise<string | undefined>;
  run: (command: string, args: string[]) => Promise<boolean>;
};

export async function preflightLocalOcr(
  settings: LocalOcrSettings,
  runtime: PreflightRuntime = localRuntime(),
): Promise<LocalOcrPreflight> {
  const [pdftoppmPath, ocrCommandPath] = await Promise.all([
    runtime.resolveCommand('pdftoppm'),
    runtime.resolveCommand(settings.command),
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
  if (settings.device === 'cuda') diagnostics.push(...await cudaDiagnostics(runtime));
  return {
    ok: diagnostics.length === 0,
    ...(pdftoppmPath ? { pdftoppmPath } : {}),
    ...(ocrCommandPath ? { ocrCommandPath } : {}),
    diagnostics,
  };
}

export async function cudaDiagnostics(runtime: PreflightRuntime): Promise<OcrDiagnostic[]> {
  if (runtime.platform !== 'linux') return [cudaDiagnostic('CUDA OCR requires a Linux runtime.')];
  const nvidiaSmiPath = await runtime.resolveCommand('nvidia-smi');
  if (!nvidiaSmiPath) {
    return [cudaDiagnostic('CUDA OCR requires nvidia-smi. Enable NVIDIA GPU support for the container and retry.')];
  }
  if (!await runtime.run(nvidiaSmiPath, ['-L'])) {
    return [cudaDiagnostic('CUDA OCR could not verify an NVIDIA GPU with nvidia-smi -L.')];
  }
  return [];
}

export async function resolveCommand(command: string): Promise<string | undefined> {
  const trimmed = command.trim();
  if (!trimmed) return undefined;
  if (path.isAbsolute(trimmed) || trimmed.includes('/') || trimmed.includes('\\')) {
    return (await canExecute(trimmed)) ? path.resolve(trimmed) : undefined;
  }
  return (await which(trimmed)) ?? undefined;
}

const localRuntime = (): PreflightRuntime => ({
  platform: process.platform,
  resolveCommand,
  run: runCommand,
});

const cudaDiagnostic = (message: string): OcrDiagnostic => ({ code: 'unexpected-local-ocr-error', message });

const runCommand = async (command: string, args: string[]): Promise<boolean> => new Promise((resolve) => {
  try {
    const child = spawn(command, args, { stdio: 'ignore', timeout: 5_000 });
    child.once('error', () => resolve(false));
    child.once('close', (code) => resolve(code === 0));
  } catch {
    resolve(false);
  }
});

async function canExecute(filePath: string): Promise<boolean> {
  const mode = process.platform === 'win32' ? constants.F_OK : constants.X_OK;
  return access(filePath, mode).then(() => true).catch(() => false);
}
