import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function getProjectRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

export function getWhisperDir(): string {
  return path.join(getProjectRoot(), 'whisper.cpp');
}

export type WhisperBackend = 'auto' | 'cpu' | 'cuda';

export async function resolveWhisperBinary(): Promise<string> {
  const dir = getWhisperDir();
  const backend = requestedBackend();
  const candidates = backend === 'cuda'
    ? cudaCandidates(dir)
    : backend === 'cpu'
      ? cpuCandidates(dir)
      : [...cudaCandidates(dir), ...cpuCandidates(dir)];

  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      // continue
    }
  }

  throw new Error(`Could not find whisper.cpp executable. Looked for: ${candidates.join(', ')}`);
}

export function resolveModelPath(model: string): string {
  // Whisper.cpp uses files like models/ggml-base.bin
  return path.join(getWhisperDir(), 'models', `ggml-${model}.bin`);
}

function requestedBackend(): WhisperBackend {
  const value = (process.env.ZENBUKKO_WHISPER_BACKEND ?? '').trim();
  if (value === 'cpu' || value === 'cuda') return value;
  if ((process.env.ZENBUKKO_WHISPER_CUDA ?? '').trim() === '1') return 'cuda';
  return 'auto';
}

function cpuCandidates(dir: string): string[] {
  return [
    path.join(dir, 'build-cpu', 'bin', 'whisper-cli'),
    path.join(dir, 'build-cpu', 'bin', 'main'),
    path.join(dir, 'build', 'bin', 'whisper-cli'),
    path.join(dir, 'build', 'bin', 'main'),
    path.join(dir, 'whisper-cli'),
    path.join(dir, 'main'),
  ];
}

function cudaCandidates(dir: string): string[] {
  return [
    path.join(dir, 'build-cuda', 'bin', 'whisper-cli'),
    path.join(dir, 'build-cuda', 'bin', 'main'),
  ];
}
