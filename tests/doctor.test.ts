import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateDoctorSnapshot } from '../src/doctor/checks.js';
import { renderDoctorReport } from '../src/commands/doctor.js';
import type { DoctorSnapshot } from '../src/doctor/types.js';

const readySnapshot = (): DoctorSnapshot => ({
  platform: 'win32',
  arch: 'x64',
  nodeVersion: '24.14.0',
  npmPath: null,
  pnpmPath: 'C:\\tools\\pnpm.cmd',
  browserPath: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ffmpegPath: 'C:\\tools\\ffmpeg.exe',
  pdftoppmPath: 'C:\\tools\\pdftoppm.exe',
  ndlocrPath: 'C:\\tools\\ndlocr-lite.exe',
  whisperPath: 'C:\\app\\whisper.cpp\\build\\bin\\whisper-cli.exe',
  whisperModelPath: 'C:\\app\\whisper.cpp\\models\\ggml-large-v3-turbo.bin',
  whisperModelExists: true,
  sessionPath: 'C:\\private\\session.json',
  sessionExists: true,
  outputDir: 'C:\\private\\downloads',
  outputWritable: true,
  webIndexPath: 'C:\\app\\dist\\web\\static\\index.html',
  webIndexExists: true,
});

test('doctor reports a complete Windows native environment', () => {
  const report = evaluateDoctorSnapshot(readySnapshot());

  assert.equal(report.ok, true);
  assert.equal(report.platform, 'win32/x64');
  assert.equal(report.checks.every((check) => check.status === 'pass'), true);
  assert.match(renderDoctorReport(report), /すべての機能依存関係/);
});

test('doctor distinguishes missing session warning from dependency failures', () => {
  const noSession = readySnapshot();
  noSession.sessionExists = false;
  const warningReport = evaluateDoctorSnapshot(noSession);
  assert.equal(warningReport.ok, true);
  assert.equal(warningReport.checks.find((check) => check.id === 'session')?.status, 'warn');

  const missingBrowser = { ...noSession, browserPath: null, browserError: 'not found' };
  const failedReport = evaluateDoctorSnapshot(missingBrowser);
  assert.equal(failedReport.ok, false);
  assert.equal(failedReport.checks.find((check) => check.id === 'browser')?.status, 'fail');
  assert.match(renderDoctorReport(failedReport), /PUPPETEER_EXECUTABLE_PATH/);
});

test('doctor rejects unsupported Node versions', () => {
  const snapshot = readySnapshot();
  snapshot.nodeVersion = '20.18.0';
  const report = evaluateDoctorSnapshot(snapshot);

  assert.equal(report.ok, false);
  assert.equal(report.checks.find((check) => check.id === 'node')?.status, 'fail');
});
