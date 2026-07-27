import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTargets, parseWhisperBackend, whisperExecutableCandidates } from '../src/whisper/backends.js';
import { discoverRenderNodes, probeVulkan, type CapabilityDependencies } from '../src/whisper/capabilities.js';
import { resolveWhisperInspection } from '../src/whisper/runtime.js';
import type { BackendCapability, WhisperRuntimeInspection } from '../src/whisper/types.js';

const unavailable = (backend: 'cpu' | 'cuda' | 'vulkan', detail: string): BackendCapability => ({ backend, available: false, detail });
const available = (backend: 'cpu' | 'cuda' | 'vulkan'): BackendCapability => ({ backend, available: true, detail: `${backend} ready` });

function inspection(requested: WhisperRuntimeInspection['requested'], capabilities: BackendCapability[]): WhisperRuntimeInspection {
  return {
    requested,
    backends: capabilities.map((capability) => ({
      capability,
      executable: { backend: capability.backend, path: capability.available || capability.detail !== 'not built' ? `/whisper/build-${capability.backend}/bin/whisper-cli` : null, buildRoot: `/whisper/build-${capability.backend}`, available: capability.detail !== 'not built' },
    })),
  };
}

test('Whisper parses Vulkan and rejects invalid backend values', () => {
  assert.equal(parseWhisperBackend('vulkan'), 'vulkan');
  assert.equal(parseWhisperBackend(undefined), 'auto');
  assert.throws(() => parseWhisperBackend('rocm'), /Invalid Whisper backend/);
  assert.deepEqual(buildTargets('vulkan'), ['vulkan']);
  assert.deepEqual(buildTargets('both'), ['cpu', 'cuda']);
  assert.deepEqual(buildTargets('all'), ['cpu', 'cuda', 'vulkan']);
});

test('Whisper candidate order is CUDA, Vulkan, then CPU and includes Vulkan build root', () => {
  const candidates = whisperExecutableCandidates('/whisper', 'auto', 'linux');
  assert.equal(candidates[0]?.backend, 'cuda');
  assert.equal(candidates[2]?.backend, 'vulkan');
  assert.ok(candidates.some((candidate) => candidate.path === '/whisper/build-vulkan/bin/whisper-cli'));
  assert.ok(whisperExecutableCandidates('C:\\whisper.cpp', 'cuda', 'win32').every((candidate) => candidate.path?.includes('\\')));
});

test('explicit Vulkan never silently falls back to CPU', () => {
  const state = inspection('vulkan', [available('cpu'), unavailable('cuda', 'not built'), unavailable('vulkan', 'no render node')]);
  assert.throws(() => resolveWhisperInspection(state), /Requested Whisper backend "vulkan" is unavailable: no render node/);
});

test('auto falls back to CPU when Vulkan capability is absent', () => {
  const state = inspection('auto', [available('cpu'), unavailable('cuda', 'not built'), unavailable('vulkan', 'no render node')]);
  const result = resolveWhisperInspection(state);
  assert.equal(result.backend, 'cpu');
  assert.match(result.warning ?? '', /vulkan \(no render node\)/);
  assert.equal(result.executable, '/whisper/build-cpu/bin/whisper-cli');
});

test('render-node discovery reports every node and permission state through injected filesystem probes', async () => {
  const nodes = await discoverRenderNodes({
    readdir: async () => ['card0', 'renderD128', 'renderD129'],
    stat: async (filePath) => ({ isCharacterDevice: () => true, gid: filePath.endsWith('128') ? 107 : 108 }),
    access: async (filePath) => { if (filePath.endsWith('129')) throw new Error('denied'); },
  });
  assert.deepEqual(nodes, [
    { path: '/dev/dri/renderD128', gid: 107, accessible: true },
    { path: '/dev/dri/renderD129', gid: 108, accessible: false },
  ]);
});

test('Vulkan probe requires render access and reports a usable physical device', async () => {
  const dependencies: CapabilityDependencies = {
    platform: 'linux', findCommand: async () => '/usr/bin/vulkaninfo', findIcds: async () => ['/usr/share/vulkan/icd.d/radeon.json'],
    discoverRenderNodes: async () => [{ path: '/dev/dri/renderD128', gid: 107, accessible: true }],
    run: async () => ({ code: 0, stdout: 'GPU0:\n\tdeviceName = AMD Radeon 780M (RADV GFX1103_R1)', stderr: '', timedOut: false }),
  };
  const usable = await probeVulkan(dependencies);
  assert.equal(usable.available, true);
  assert.match(usable.deviceName ?? '', /Radeon 780M/);
  const inaccessible = await probeVulkan({ ...dependencies, discoverRenderNodes: async () => [{ path: '/dev/dri/renderD128', gid: 107, accessible: false }] });
  assert.equal(inaccessible.available, false);
  assert.match(inaccessible.detail, /not readable and writable/);
});
