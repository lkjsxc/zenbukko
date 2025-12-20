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

export async function resolveWhisperBinary(): Promise<string> {
  const dir = getWhisperDir();
  const candidates = [
    path.join(dir, 'main'),
    path.join(dir, 'whisper-cli'),
    path.join(dir, 'build', 'bin', 'whisper-cli'),
    path.join(dir, 'build', 'bin', 'main'),
  ];

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
