import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export type WhisperBackend = 'auto' | 'cpu' | 'cuda';

export function getProjectRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

export function getWhisperDir(): string {
  return path.join(getProjectRoot(), 'whisper.cpp');
}

export async function resolveWhisperBinary(): Promise<string> {
  const candidates = whisperBinaryCandidates(getWhisperDir(), requestedBackend());
  const found = await findExistingFile(candidates);
  if (found) return found;
  throw new Error(`Could not find whisper.cpp executable. Looked for: ${candidates.join(', ')}`);
}

export async function findWhisperBinary(): Promise<string | null> {
  return findExistingFile(whisperBinaryCandidates(getWhisperDir(), requestedBackend()));
}

export function whisperBinaryCandidates(
  directory: string,
  backend: WhisperBackend,
  platform: NodeJS.Platform = process.platform,
): string[] {
  const names = platform === 'win32' ? ['whisper-cli.exe', 'main.exe'] : ['whisper-cli', 'main'];
  const cpuRoots = ['build-cpu/bin', 'build/bin', '.'];
  const cudaRoots = ['build-cuda/bin'];
  const roots = backend === 'cuda' ? cudaRoots : backend === 'cpu' ? cpuRoots : [...cudaRoots, ...cpuRoots];
  return roots.flatMap((root) => names.map((name) => path.join(directory, root, name)));
}

export function resolveModelPath(model: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model)) {
    throw new Error('Whisper model name may contain only letters, numbers, dot, underscore, and hyphen.');
  }
  return path.join(getWhisperDir(), 'models', `ggml-${model}.bin`);
}

function requestedBackend(): WhisperBackend {
  const value = (process.env.ZENBUKKO_WHISPER_BACKEND ?? '').trim();
  if (value === 'cpu' || value === 'cuda') return value;
  if ((process.env.ZENBUKKO_WHISPER_CUDA ?? '').trim() === '1') return 'cuda';
  return 'auto';
}

async function findExistingFile(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    const found = await fs.stat(candidate).then((value) => value.isFile()).catch(() => false);
    if (found) return candidate;
  }
  return null;
}
