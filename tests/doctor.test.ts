import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateDoctorSnapshot } from '../src/doctor/checks.js';
import { renderDoctorReport } from '../src/commands/doctor.js';
import type { DoctorSnapshot } from '../src/doctor/types.js';

const readySnapshot = (): DoctorSnapshot => ({
  platform: 'win32', arch: 'x64', nodeVersion: '24.14.0', npmPath: null, pnpmPath: 'C:\\tools\\pnpm.cmd',
  browserPath: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', ffmpegPath: 'C:\\tools\\ffmpeg.exe',
  pdftoppmPath: 'C:\\tools\\pdftoppm.exe', ndlocrPath: 'C:\\tools\\ndlocr-lite.exe',
  whisper: {
    requested: 'cpu', requestedValid: true,
    resolved: { requested: 'cpu', backend: 'cpu', executable: 'C:\\app\\whisper.cpp\\build-cpu\\bin\\whisper-cli.exe', buildRoot: 'C:\\app\\whisper.cpp\\build-cpu', capability: { backend: 'cpu', available: true, detail: 'CPU ready' } },
    executables: [
      { backend: 'cpu', path: 'C:\\app\\whisper.cpp\\build-cpu\\bin\\whisper-cli.exe', buildRoot: 'C:\\app\\whisper.cpp\\build-cpu', available: true },
      { backend: 'cuda', path: null, buildRoot: 'C:\\app\\whisper.cpp\\build-cuda', available: false },
      { backend: 'vulkan', path: null, buildRoot: 'C:\\app\\whisper.cpp\\build-vulkan', available: false },
    ],
    capabilities: [
      { backend: 'cpu', available: true, detail: 'CPU ready' }, { backend: 'cuda', available: false, detail: 'not built' }, { backend: 'vulkan', available: false, detail: 'not built' },
    ],
    modelPath: 'C:\\app\\data\\models\\whisper\\ggml-large-v3-turbo.bin', modelExists: true, modelValid: true, modelDetail: 'verified', cpuFallbackAvailable: true,
  },
  sessionPath: 'C:\\private\\session.json', sessionExists: true, outputDir: 'C:\\private\\downloads', outputWritable: true,
  webIndexPath: 'C:\\app\\dist\\web\\static\\index.html', webIndexExists: true,
});

test('doctor reports a complete Windows CPU native environment', () => {
  const report = evaluateDoctorSnapshot(readySnapshot());
  assert.equal(report.ok, true);
  assert.equal(report.platform, 'win32/x64');
  assert.equal(report.checks.every((check) => check.status === 'pass'), true);
  assert.match(renderDoctorReport(report), /requested=cpu; resolved=cpu/);
});

test('doctor distinguishes missing session warning from dependency failures', () => {
  const noSession = readySnapshot();
  noSession.sessionExists = false;
  assert.equal(evaluateDoctorSnapshot(noSession).checks.find((check) => check.id === 'session')?.status, 'warn');
  const missingBrowser = { ...noSession, browserPath: null, browserError: 'not found' };
  assert.equal(evaluateDoctorSnapshot(missingBrowser).ok, false);
  assert.match(renderDoctorReport(evaluateDoctorSnapshot(missingBrowser)), /PUPPETEER_EXECUTABLE_PATH/);
});

test('doctor reports Vulkan binary without a render node as a warning in auto mode and a failure when explicit', () => {
  const automatic = readySnapshot();
  automatic.platform = 'linux';
  automatic.whisper.requested = 'auto';
  automatic.whisper.resolved = { ...automatic.whisper.resolved, requested: 'auto' };
  automatic.whisper.executables[2] = { backend: 'vulkan', path: '/app/whisper.cpp/build-vulkan/bin/whisper-cli', buildRoot: '/app/whisper.cpp/build-vulkan', available: true };
  automatic.whisper.capabilities[2] = { backend: 'vulkan', available: false, detail: 'no DRM render nodes were found under /dev/dri', renderNodes: [] };
  assert.equal(evaluateDoctorSnapshot(automatic).checks.find((check) => check.id === 'vulkan-runtime')?.status, 'warn');
  automatic.whisper.requested = 'vulkan';
  automatic.whisper.resolved = null;
  automatic.whisper.resolutionError = 'Requested Whisper backend "vulkan" is unavailable: no DRM render nodes';
  assert.equal(evaluateDoctorSnapshot(automatic).checks.find((check) => check.id === 'vulkan-runtime')?.status, 'fail');
});

test('doctor rejects unsupported Node versions', () => {
  const snapshot = readySnapshot();
  snapshot.nodeVersion = '20.18.0';
  assert.equal(evaluateDoctorSnapshot(snapshot).checks.find((check) => check.id === 'node')?.status, 'fail');
});
