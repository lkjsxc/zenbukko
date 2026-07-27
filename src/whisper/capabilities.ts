import { constants } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { runCapturedProcess, type CapturedProcessResult } from '../utils/process.js';
import { which } from '../utils/which.js';
import type { BackendCapability, RenderNode, WhisperRuntimeBackend } from './types.js';

export type RenderNodeFilesystem = {
  readdir(directory: string): Promise<string[]>;
  stat(filePath: string): Promise<{ isCharacterDevice(): boolean; gid: number }>;
  access(filePath: string, mode: number): Promise<void>;
};

export type CapabilityDependencies = {
  platform: NodeJS.Platform;
  findCommand(command: string): Promise<string | null>;
  run(command: string, args: string[]): Promise<CapturedProcessResult>;
  discoverRenderNodes(): Promise<RenderNode[]>;
  findIcds(): Promise<string[]>;
};

export async function discoverRenderNodes(
  filesystem: RenderNodeFilesystem = { readdir, stat, access },
  directory = '/dev/dri',
): Promise<RenderNode[]> {
  const names = await filesystem.readdir(directory).catch(() => []);
  return Promise.all(names.filter((name) => /^renderD\d+$/.test(name)).map(async (name) => {
    const nodePath = path.join(directory, name);
    const info = await filesystem.stat(nodePath).catch(() => null);
    if (!info?.isCharacterDevice()) return null;
    const accessible = await filesystem.access(nodePath, constants.R_OK | constants.W_OK).then(() => true).catch(() => false);
    return { path: nodePath, gid: info.gid, accessible };
  })).then((nodes) => nodes.filter((node): node is RenderNode => node !== null));
}

export async function probeBackend(
  backend: WhisperRuntimeBackend,
  executableAvailable: boolean,
  dependencies: CapabilityDependencies = defaultCapabilityDependencies(),
): Promise<BackendCapability> {
  if (!executableAvailable) return { backend, available: false, detail: `${backend} whisper executable is not built` };
  if (backend === 'cpu') return { backend, available: true, detail: 'CPU whisper executable is available' };
  return backend === 'vulkan' ? probeVulkan(dependencies) : probeCuda(dependencies);
}

export async function probeVulkan(dependencies: CapabilityDependencies = defaultCapabilityDependencies()): Promise<BackendCapability> {
  if (dependencies.platform !== 'linux') return { backend: 'vulkan', available: false, detail: 'Vulkan runtime probing is supported on Linux only' };
  const renderNodes = await dependencies.discoverRenderNodes();
  if (!renderNodes.length) return { backend: 'vulkan', available: false, detail: 'no DRM render nodes were found under /dev/dri', renderNodes };
  if (!renderNodes.some((node) => node.accessible)) return { backend: 'vulkan', available: false, detail: 'DRM render nodes exist but are not readable and writable by this user', renderNodes };
  const vulkaninfo = await dependencies.findCommand('vulkaninfo');
  if (!vulkaninfo) return { backend: 'vulkan', available: false, detail: 'vulkaninfo is unavailable; install Vulkan loader tools', renderNodes, loaderAvailable: false };
  const icdPaths = await dependencies.findIcds();
  if (!icdPaths.length) return { backend: 'vulkan', available: false, detail: 'no Vulkan ICD JSON files were found', renderNodes, loaderAvailable: true, icdPaths };
  const result = await dependencies.run(vulkaninfo, ['--summary']);
  const deviceName = vulkanDeviceName(result);
  if (result.code !== 0 || result.timedOut) return { backend: 'vulkan', available: false, detail: processFailure('vulkaninfo', result), renderNodes, loaderAvailable: true, icdPaths };
  if (!deviceName) return { backend: 'vulkan', available: false, detail: 'vulkaninfo did not report a physical device', renderNodes, loaderAvailable: true, icdPaths };
  if (/(llvmpipe|lavapipe|swiftshader|software rasterizer)/i.test(deviceName)) return { backend: 'vulkan', available: false, detail: `Vulkan reported software device: ${deviceName}`, deviceName, renderNodes, loaderAvailable: true, icdPaths };
  return { backend: 'vulkan', available: true, detail: 'Vulkan loader, ICD, render node, and physical device are usable', deviceName, renderNodes, loaderAvailable: true, icdPaths };
}

export async function probeCuda(dependencies: CapabilityDependencies = defaultCapabilityDependencies()): Promise<BackendCapability> {
  if ((process.env.CUDA_VISIBLE_DEVICES ?? '').trim() === '-1') return { backend: 'cuda', available: false, detail: 'CUDA_VISIBLE_DEVICES disables all CUDA devices' };
  const nvidiaSmi = await dependencies.findCommand('nvidia-smi');
  if (!nvidiaSmi) return { backend: 'cuda', available: false, detail: 'nvidia-smi is unavailable; expose a CUDA-capable NVIDIA runtime' };
  const result = await dependencies.run(nvidiaSmi, ['--query-gpu=index,name', '--format=csv,noheader']);
  const deviceName = result.stdout.trim().split('\n').find(Boolean)?.trim();
  if (result.code !== 0 || !deviceName) return { backend: 'cuda', available: false, detail: processFailure('nvidia-smi', result) };
  return { backend: 'cuda', available: true, detail: 'CUDA device is usable', deviceName };
}

export function defaultCapabilityDependencies(): CapabilityDependencies {
  return {
    platform: process.platform,
    findCommand: which,
    run: (command, args) => runCapturedProcess(command, args, { timeoutMs: 3_000, maxOutputBytes: 64 * 1024, env: { LC_ALL: 'C' } }),
    discoverRenderNodes,
    findIcds,
  };
}

async function findIcds(): Promise<string[]> {
  const roots = ['/etc/vulkan/icd.d', '/usr/share/vulkan/icd.d'];
  const lists = await Promise.all(roots.map(async (root) => (await readdir(root).catch(() => [])).filter((name) => name.endsWith('.json')).map((name) => path.join(root, name))));
  return lists.flat();
}

function vulkanDeviceName(result: CapturedProcessResult): string | undefined {
  return `${result.stdout}\n${result.stderr}`.match(/deviceName\s*=\s*([^\r\n]+)/)?.[1]?.trim();
}

function processFailure(command: string, result: CapturedProcessResult): string {
  const detail = result.timedOut ? 'timed out' : result.error || `exited with code ${result.code ?? 'unknown'}`;
  return `${command} ${detail}`;
}
