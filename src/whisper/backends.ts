import path from 'node:path';
import type { WhisperBackendRequest, WhisperExecutable, WhisperRuntimeBackend, WhisperSetupBackend } from './types.js';

export const WHISPER_BACKEND_PRIORITY: readonly WhisperRuntimeBackend[] = ['cuda', 'vulkan', 'cpu'];

const DEFINITIONS: Record<WhisperRuntimeBackend, { buildDirectory: string; cmakeArgs: string[] }> = {
  cpu: { buildDirectory: 'build-cpu', cmakeArgs: [] },
  cuda: { buildDirectory: 'build-cuda', cmakeArgs: ['-DGGML_CUDA=ON'] },
  vulkan: { buildDirectory: 'build-vulkan', cmakeArgs: ['-DGGML_VULKAN=ON'] },
};

export function parseWhisperBackend(value: unknown): WhisperBackendRequest {
  if (value === undefined || value === null || String(value).trim() === '') return 'auto';
  const backend = String(value).trim().toLowerCase();
  if (backend === 'auto' || backend === 'cpu' || backend === 'cuda' || backend === 'vulkan') return backend;
  throw new Error(`Invalid Whisper backend "${backend}". Use auto, cpu, cuda, or vulkan.`);
}

export function parseWhisperSetupBackend(value: unknown): WhisperSetupBackend {
  const backend = value === undefined || value === null || String(value).trim() === '' ? 'auto' : String(value).trim().toLowerCase();
  if (backend === 'both' || backend === 'all') return backend;
  return parseWhisperBackend(backend);
}

export function requestedWhisperBackend(env: NodeJS.ProcessEnv = process.env): WhisperBackendRequest {
  return parseWhisperBackend(env.ZENBUKKO_WHISPER_BACKEND);
}

export function buildTargets(selection: WhisperSetupBackend): WhisperRuntimeBackend[] {
  if (selection === 'auto') return ['cpu'];
  if (selection === 'both') return ['cpu', 'cuda'];
  if (selection === 'all') return ['cpu', 'cuda', 'vulkan'];
  return [selection];
}

export function cmakeArgsFor(backend: WhisperRuntimeBackend): string[] {
  return [...DEFINITIONS[backend].cmakeArgs];
}

export function whisperExecutableCandidates(
  directory: string,
  request: WhisperBackendRequest,
  platform: NodeJS.Platform = process.platform,
): WhisperExecutable[] {
  const backends = request === 'auto' ? WHISPER_BACKEND_PRIORITY : [request];
  return backends.flatMap((backend) => executableCandidates(directory, backend, platform));
}

export function executableCandidates(
  directory: string,
  backend: WhisperRuntimeBackend,
  platform: NodeJS.Platform = process.platform,
): WhisperExecutable[] {
  const pathApi = platform === 'win32' ? path.win32 : path;
  const names = platform === 'win32' ? ['whisper-cli.exe', 'main.exe'] : ['whisper-cli', 'main'];
  const locations = backend === 'cpu'
    ? [{ root: 'build-cpu', executableDir: 'build-cpu/bin' }, { root: 'build', executableDir: 'build/bin' }, { root: '.', executableDir: '.' }]
    : [{ root: DEFINITIONS[backend].buildDirectory, executableDir: `${DEFINITIONS[backend].buildDirectory}/bin` }];
  return locations.flatMap(({ root, executableDir }) => names.map((name) => ({
    backend,
    path: pathApi.join(directory, executableDir, name),
    buildRoot: pathApi.join(directory, root),
    available: false,
  })));
}

export function buildDirectoryFor(backend: WhisperRuntimeBackend): string {
  return DEFINITIONS[backend].buildDirectory;
}
