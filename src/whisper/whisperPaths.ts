import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { whisperExecutableCandidates } from './backends.js';
import type { WhisperBackendRequest } from './types.js';

export type WhisperBackend = WhisperBackendRequest;

export function getProjectRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

export function getWhisperDir(): string {
  return path.join(getProjectRoot(), 'whisper.cpp');
}

export function getWhisperModelDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.ZENBUKKO_WHISPER_MODEL_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(getProjectRoot(), 'data', 'models', 'whisper');
}

export function resolveModelPath(model: string, modelDir = getWhisperModelDir()): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model)) {
    throw new Error('Whisper model name may contain only letters, numbers, dot, underscore, and hyphen.');
  }
  return path.join(modelDir, `ggml-${model}.bin`);
}

export async function readWhisperCppRef(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const configured = env.WHISPER_CPP_REF?.trim();
  const ref = configured || (await fs.readFile(path.join(getProjectRoot(), 'docker', 'whisper.cpp.ref'), 'utf8')).trim();
  if (!/^[0-9a-f]{40}$/i.test(ref)) throw new Error('WHISPER_CPP_REF must be an exact 40-character upstream Git commit.');
  return ref;
}

export function whisperBinaryCandidates(
  directory: string,
  backend: WhisperBackend,
  platform: NodeJS.Platform = process.platform,
): string[] {
  return whisperExecutableCandidates(directory, backend, platform).flatMap((candidate) => candidate.path ? [candidate.path] : []);
}
