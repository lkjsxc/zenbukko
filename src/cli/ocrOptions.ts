import type { Command } from 'commander';
import type { AppConfig, LocalOcrDevice } from '../config.js';

export type CliLocalOcrOptions = {
  ndlocrCommand: string;
  ndlocrDevice: LocalOcrDevice;
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
};

export function addLocalOcrOptions(command: Command): Command {
  return command
    .option('--ndlocr-command <path>', 'NDLOCR-Lite executable')
    .option('--ndlocr-device <device>', 'cpu|cuda')
    .option('--ocr-page-dpi <n>', 'PDF rasterization DPI for local OCR', (v) => Number(v))
    .option('--ocr-keep-intermediates', 'Keep local OCR page images and raw output', false)
    .option('--ndlocr-enable-tcy', 'Enable NDLOCR-Lite tate-chu-yoko handling')
    .option('--no-ndlocr-enable-tcy', 'Disable NDLOCR-Lite tate-chu-yoko handling');
}

export function localOcrOptionsFrom(cmd: Record<string, unknown>, cfg: AppConfig): CliLocalOcrOptions {
  return {
    ndlocrCommand: stringOption(cmd.ndlocrCommand, cfg.ndlocrCommand),
    ndlocrDevice: deviceFrom(cmd.ndlocrDevice, cfg.ndlocrDevice),
    ocrPageDpi: numberOption(cmd.ocrPageDpi, cfg.ocrPageDpi),
    ocrKeepIntermediates: Boolean(cmd.ocrKeepIntermediates) || cfg.ocrKeepIntermediates,
    ndlocrEnableTcy: booleanOption(cmd.ndlocrEnableTcy, cfg.ndlocrEnableTcy),
  };
}

function deviceFrom(value: unknown, fallback: LocalOcrDevice): LocalOcrDevice {
  return value === 'cpu' || value === 'cuda' ? value : fallback;
}

function numberOption(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOption(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
