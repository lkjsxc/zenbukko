import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import type { AppConfig } from '../config.js';
import { resolveBrowserExecutablePath } from '../services/browser.js';
import { resolveCommand } from '../services/ocr/preflight.js';
import { which } from '../utils/which.js';
import { requestedWhisperBackend } from '../whisper/backends.js';
import { probeCuda, probeVulkan } from '../whisper/capabilities.js';
import { inspectWhisperModel } from '../whisper/models.js';
import { inspectWhisperRuntime, resolveWhisperInspection } from '../whisper/runtime.js';
import { getProjectRoot } from '../whisper/whisperPaths.js';
import type { DoctorSnapshot } from './types.js';

export async function collectDoctorSnapshot(config: AppConfig, model: string): Promise<DoctorSnapshot> {
  const browser = await browserProbe();
  const requested = readRequestedBackend();
  const inspection = await inspectWhisperRuntime({ requested: requested.value });
  const resolved = requested.error ? { runtime: null, error: requested.error } : tryResolve(inspection);
  const vulkan = inspection.backends.find((entry) => entry.executable.backend === 'vulkan');
  const cuda = inspection.backends.find((entry) => entry.executable.backend === 'cuda');
  const [modelStatus, vulkanCapability, cudaCapability] = await Promise.all([
    inspectWhisperModel(model), vulkan?.executable.available ? Promise.resolve(vulkan.capability) : probeVulkan(), cuda?.executable.available ? Promise.resolve(cuda.capability) : probeCuda(),
  ]);
  const bundledFfmpeg = typeof ffmpegStatic === 'string' && await isFile(ffmpegStatic) ? ffmpegStatic : null;
  const [npmPath, pnpmPath, systemFfmpeg, pdftoppmPath, ndlocrPath, sessionExists, outputWritable] = await Promise.all([
    which('npm'), which('pnpm'), which('ffmpeg'), resolveCommand('pdftoppm'), resolveCommand(config.ndlocrCommand),
    isFile(config.sessionPath), hasWritableParent(config.outputDir),
  ]);
  const webIndexPath = path.join(getProjectRoot(), 'dist', 'web', 'static', 'index.html');
  return {
    platform: process.platform, arch: process.arch, nodeVersion: process.versions.node, npmPath, pnpmPath,
    browserPath: browser.path, ...(browser.error ? { browserError: browser.error } : {}),
    ffmpegPath: systemFfmpeg ?? bundledFfmpeg, pdftoppmPath: pdftoppmPath ?? null, ndlocrPath: ndlocrPath ?? null,
    whisper: {
      requested: requested.raw, requestedValid: !requested.error, resolved: resolved.runtime,
      ...(requested.error || resolved.error ? { resolutionError: requested.error ?? resolved.error } : {}),
      executables: inspection.backends.map((entry) => entry.executable),
      capabilities: inspection.backends.map((entry) => entry.executable.backend === 'vulkan' ? vulkanCapability : entry.executable.backend === 'cuda' ? cudaCapability : entry.capability),
      modelPath: modelStatus.path, modelExists: modelStatus.exists, modelValid: modelStatus.valid, modelDetail: modelStatus.detail,
      cpuFallbackAvailable: inspection.backends.some((entry) => entry.executable.backend === 'cpu' && entry.capability.available),
    },
    sessionPath: path.resolve(config.sessionPath), sessionExists, outputDir: path.resolve(config.outputDir), outputWritable,
    webIndexPath, webIndexExists: await isFile(webIndexPath),
  };
}

function readRequestedBackend(): { raw: string; value: 'auto' | 'cpu' | 'cuda' | 'vulkan'; error?: string } {
  const raw = (process.env.ZENBUKKO_WHISPER_BACKEND ?? 'auto').trim() || 'auto';
  try { return { raw, value: requestedWhisperBackend() }; } catch (error) { return { raw, value: 'auto', error: error instanceof Error ? error.message : String(error) }; }
}

function tryResolve(inspection: Awaited<ReturnType<typeof inspectWhisperRuntime>>): { runtime: ReturnType<typeof resolveWhisperInspection> | null; error?: string } {
  try { return { runtime: resolveWhisperInspection(inspection) }; } catch (error) { return { runtime: null, error: error instanceof Error ? error.message : String(error) }; }
}

async function browserProbe(): Promise<{ path: string | null; error?: string }> {
  try { return { path: await resolveBrowserExecutablePath() }; } catch (error) { return { path: null, error: error instanceof Error ? error.message : String(error) }; }
}

async function hasWritableParent(target: string): Promise<boolean> {
  let current = path.resolve(target);
  while (true) {
    const info = await stat(current).catch(() => null);
    if (info) return info.isDirectory() && access(current, constants.W_OK).then(() => true).catch(() => false);
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath).then((value) => value.isFile()).catch(() => false);
}
