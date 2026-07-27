import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { requestedWhisperBackend, whisperExecutableCandidates } from './backends.js';
import { probeBackend, type CapabilityDependencies } from './capabilities.js';
import type { BackendCapability, ResolvedWhisperRuntime, WhisperBackendInspection, WhisperBackendRequest, WhisperExecutable, WhisperRuntimeBackend, WhisperRuntimeInspection } from './types.js';
import { getWhisperDir } from './whisperPaths.js';

export type RuntimeDependencies = {
  directory: string;
  platform: NodeJS.Platform;
  requested: WhisperBackendRequest;
  isExecutable(candidate: string, platform: NodeJS.Platform): Promise<boolean>;
  probe(backend: WhisperRuntimeBackend, executableAvailable: boolean): Promise<BackendCapability>;
  capabilityDependencies?: CapabilityDependencies;
};

export async function inspectWhisperRuntime(options: Partial<RuntimeDependencies> = {}): Promise<WhisperRuntimeInspection> {
  const dependencies = defaultDependencies(options);
  const candidates = whisperExecutableCandidates(dependencies.directory, 'auto', dependencies.platform);
  const backends = await Promise.all((['cpu', 'cuda', 'vulkan'] as const).map(async (backend) => {
    const executable = await firstExecutable(candidates.filter((candidate) => candidate.backend === backend), dependencies);
    return { executable, capability: await dependencies.probe(backend, executable.available) };
  }));
  return { requested: dependencies.requested, backends };
}

export async function resolveWhisperRuntime(options: Partial<RuntimeDependencies> = {}): Promise<ResolvedWhisperRuntime> {
  return resolveWhisperInspection(await inspectWhisperRuntime(options));
}

export function resolveWhisperInspection(inspection: WhisperRuntimeInspection): ResolvedWhisperRuntime {
  const order: WhisperRuntimeBackend[] = inspection.requested === 'auto' ? ['cuda', 'vulkan', 'cpu'] : [inspection.requested];
  const selected = order.map((backend) => inspection.backends.find((entry) => entry.executable.backend === backend)).find((entry) => entry?.capability.available);
  if (!selected?.executable.path) {
    const detail = order.map((backend) => inspection.backends.find((entry) => entry.executable.backend === backend)?.capability.detail ?? `${backend} was not inspected`).join('; ');
    throw new Error(`Requested Whisper backend "${inspection.requested}" is unavailable: ${detail}`);
  }
  const warning = inspection.requested === 'auto' ? automaticFallbackWarning(selected.executable.backend, inspection.backends) : undefined;
  return {
    requested: inspection.requested,
    backend: selected.executable.backend,
    executable: selected.executable.path,
    buildRoot: selected.executable.buildRoot,
    capability: selected.capability,
    ...(warning ? { warning } : {}),
  };
}

function automaticFallbackWarning(selected: WhisperRuntimeBackend, inspections: WhisperBackendInspection[]): string | undefined {
  if (selected === 'cuda') return undefined;
  const unavailable = inspections.filter((entry) => entry.executable.backend !== 'cpu' && entry.executable.available && !entry.capability.available);
  if (!unavailable.length) return undefined;
  return `Whisper auto selected ${selected}; unavailable accelerator(s): ${unavailable.map((entry) => `${entry.executable.backend} (${entry.capability.detail})`).join(', ')}`;
}

async function firstExecutable(candidates: WhisperExecutable[], dependencies: RuntimeDependencies): Promise<WhisperExecutable> {
  for (const candidate of candidates) {
    if (candidate.path && await dependencies.isExecutable(candidate.path, dependencies.platform)) return { ...candidate, available: true };
  }
  const fallback = candidates[0];
  if (!fallback) throw new Error('Whisper backend registry returned no executable candidates.');
  return { ...fallback, path: null, available: false };
}

function defaultDependencies(options: Partial<RuntimeDependencies>): RuntimeDependencies {
  return {
    directory: options.directory ?? getWhisperDir(),
    platform: options.platform ?? process.platform,
    requested: options.requested ?? requestedWhisperBackend(),
    isExecutable: options.isExecutable ?? usableExecutable,
    probe: options.probe ?? ((backend, executableAvailable) => probeBackend(backend, executableAvailable, options.capabilityDependencies)),
  };
}

async function usableExecutable(candidate: string, platform: NodeJS.Platform): Promise<boolean> {
  const info = await stat(candidate).catch(() => null);
  if (!info?.isFile()) return false;
  return platform === 'win32' || access(candidate, constants.X_OK).then(() => true).catch(() => false);
}
