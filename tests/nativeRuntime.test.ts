import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough, Writable } from 'node:stream';
import {
  browserSystemCandidates,
  resolveBrowserExecutablePath,
} from '../src/services/browser.js';
import { waitForEnter } from '../src/services/auth.js';
import { isAllowedPdfResourceUrl } from '../src/services/materials/pdfRender.js';
import { which } from '../src/utils/which.js';
import { resolveModelPath, whisperBinaryCandidates } from '../src/whisper/whisperPaths.js';

test('Windows browser candidates include installed Edge channels', () => {
  const candidates = browserSystemCandidates('win32', {
    PROGRAMFILES: 'C:\\Program Files',
    'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
    LOCALAPPDATA: 'C:\\Users\\operator\\AppData\\Local',
  }, 'C:\\Users\\operator');

  assert.ok(candidates.includes('C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe'));
  assert.ok(candidates.includes('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
});

test('browser resolver honors explicit path and reports an invalid override', async () => {
  const configured = 'C:\\Browser\\msedge.exe';
  const options = {
    platform: 'win32' as const,
    env: { PUPPETEER_EXECUTABLE_PATH: configured },
    bundledExecutablePath: null,
    exists: async (candidate: string) => candidate === configured,
    findCommand: async () => null,
  };

  assert.equal(await resolveBrowserExecutablePath(options), configured);
  await assert.rejects(
    resolveBrowserExecutablePath({ ...options, exists: async () => false }),
    /Fix PUPPETEER_EXECUTABLE_PATH/,
  );
});

test('which resolves Windows PATHEXT commands', async () => {
  const executable = 'C:\\tools\\tool.CMD';
  const found = await which('tool', {
    platform: 'win32',
    envPath: 'C:\\tools',
    pathExt: '.EXE;.CMD',
    isUsableFile: async (candidate) => candidate === executable,
  });

  assert.equal(found, executable);
});

test('auth confirmation restores paused input and removes listeners', async () => {
  const stdin = new PassThrough();
  stdin.pause();
  let output = '';
  const stdout = new Writable({ write(chunk, _encoding, done) { output += String(chunk); done(); } });

  const pending = waitForEnter({ stdin, stdout });
  stdin.write('\n');
  await pending;

  assert.equal(stdin.isPaused(), true);
  assert.equal(stdin.listenerCount('data'), 0);
  assert.equal(stdin.listenerCount('end'), 0);
  assert.match(output, /Press ENTER/);
});

test('auth confirmation abort cleans up terminal listeners', async () => {
  const stdin = new PassThrough();
  stdin.pause();
  const controller = new AbortController();
  const pending = waitForEnter({ stdin, stdout: new PassThrough(), signal: controller.signal });
  controller.abort(new Error('browser closed'));

  await assert.rejects(pending, /browser closed/);
  assert.equal(stdin.isPaused(), true);
  assert.equal(stdin.listenerCount('data'), 0);
});

test('PDF renderer blocks network resources and scripts by policy', () => {
  assert.equal(isAllowedPdfResourceUrl('file:///tmp/material.html'), true);
  assert.equal(isAllowedPdfResourceUrl('data:image/png;base64,AA=='), true);
  assert.equal(isAllowedPdfResourceUrl('https://example.test/tracker.js'), false);
  assert.equal(isAllowedPdfResourceUrl('javascript:alert(1)'), false);
});

test('whisper paths support Windows executables and safe model names', () => {
  const candidates = whisperBinaryCandidates('C:\\whisper.cpp', 'auto', 'win32');
  assert.ok(candidates.some((candidate) => candidate.endsWith('whisper-cli.exe')));
  assert.throws(() => resolveModelPath('../private'), /model name/);
});
