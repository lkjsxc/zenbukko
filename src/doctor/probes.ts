import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import type { AppConfig } from '../config.js';
import { resolveBrowserExecutablePath } from '../services/browser.js';
import { resolveCommand } from '../services/ocr/preflight.js';
import { which } from '../utils/which.js';
import { findWhisperBinary, getProjectRoot, resolveModelPath } from '../whisper/whisperPaths.js';
import type { DoctorSnapshot } from './types.js';

export async function collectDoctorSnapshot(config: AppConfig, model: string): Promise<DoctorSnapshot> {
  const browser = await browserProbe();
  const bundledFfmpeg = typeof ffmpegStatic === 'string' && await isFile(ffmpegStatic) ? ffmpegStatic : null;
  const whisperModelPath = resolveModelPath(model);
  const [
    npmPath, pnpmPath, systemFfmpeg, pdftoppmPath, ndlocrPath, whisperPath,
    whisperModelExists, sessionExists, outputWritable,
  ] = await Promise.all([
    which('npm'),
    which('pnpm'),
    which('ffmpeg'),
    resolveCommand('pdftoppm'),
    resolveCommand(config.ndlocrCommand),
    findWhisperBinary(),
    isFile(whisperModelPath),
    isFile(config.sessionPath),
    hasWritableParent(config.outputDir),
  ]);
  const webIndexPath = path.join(getProjectRoot(), 'dist', 'web', 'static', 'index.html');
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    npmPath,
    pnpmPath,
    browserPath: browser.path,
    ...(browser.error ? { browserError: browser.error } : {}),
    ffmpegPath: systemFfmpeg ?? bundledFfmpeg,
    pdftoppmPath: pdftoppmPath ?? null,
    ndlocrPath: ndlocrPath ?? null,
    whisperPath,
    whisperModelPath,
    whisperModelExists,
    sessionPath: path.resolve(config.sessionPath),
    sessionExists,
    outputDir: path.resolve(config.outputDir),
    outputWritable,
    webIndexPath,
    webIndexExists: await isFile(webIndexPath),
  };
}

async function browserProbe(): Promise<{ path: string | null; error?: string }> {
  try {
    return { path: await resolveBrowserExecutablePath() };
  } catch (error) {
    return { path: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function hasWritableParent(target: string): Promise<boolean> {
  let current = path.resolve(target);
  while (true) {
    const info = await stat(current).catch(() => null);
    if (info) {
      if (!info.isDirectory()) return false;
      return access(current, constants.W_OK).then(() => true).catch(() => false);
    }
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath).then((value) => value.isFile()).catch(() => false);
}
