import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSessionPrefill, buildSessionWriteError, parseStoredSession, SessionStore } from '../src/session/sessionStore.js';
import { loadApiSettings, mergeApiSettings, saveApiSettings } from '../src/api/settings.js';
import { normalizeJobRequest } from '../src/api/requests.js';
import type { AppConfig } from '../src/config.js';

const cfg: AppConfig = {
  sessionPath: '/data/session.json',
  outputDir: '/data/downloads',
  logLevel: 'info',
  puppeteerHeadless: true,
  ndlocrCommand: 'ndlocr-cmd',
  ndlocrDevice: 'cuda',
  ocrPageDpi: 250,
  ocrKeepIntermediates: true,
  ndlocrEnableTcy: true,
  webPort: 8787,
  apiPort: 8788,
  apiUrl: 'http://127.0.0.1:8788',
  webDataDir: '/data/web-ui',
};

test('buildSessionPrefill returns normalized formatted session text', () => {
  const session = parseStoredSession({ cookies: 'a=b', created_at: '2026-01-01T00:00:00.000Z' });
  const payload = buildSessionPrefill(session);
  assert.equal(payload.exists, true);
  assert.match(payload.text, /"cookieHeader": "a=b"/);
});

test('buildSessionWriteError explains root-owned data directories', () => {
  const cause = Object.assign(new Error('permission denied'), { code: 'EACCES' });
  const error = buildSessionWriteError('/work/zenbukko/data/session.json', cause);
  assert.match(error.message, /Cannot write session file/);
  assert.match(error.message, /sudo chown -R/);
});

test('SessionStore atomically replaces private session data', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-session-'));
  const sessionPath = path.join(dir, 'session.json');
  const store = new SessionStore(sessionPath);
  await store.save({ savedAt: '2026-01-01T00:00:00.000Z', cookies: [] });
  await store.save({ savedAt: '2026-02-01T00:00:00.000Z', cookies: [] });

  assert.equal((await store.load())?.savedAt, '2026-02-01T00:00:00.000Z');
  assert.deepEqual((await fs.readdir(dir)).sort(), ['session.json']);
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(sessionPath)).mode & 0o777, 0o600);
  }
});

test('mergeApiSettings gives saved browser values precedence over env defaults', () => {
  const effective = mergeApiSettings(cfg, {
    ndlocrCommand: 'saved-ocr',
    ndlocrDevice: 'cpu',
    chapterRange: '1-2',
    ocrPageDpi: 300,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: false,
  });
  assert.deepEqual(effective, {
    chapterRange: '1-2',
    ndlocrCommand: 'saved-ocr',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 300,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: false,
  });
});

test('mergeApiSettings uses configured OCR command defaults when settings are not saved', () => {
  const effective = mergeApiSettings(cfg, { chapterRange: '1-3' });
  assert.equal(effective.ndlocrCommand, 'ndlocr-cmd');
  assert.equal(effective.ndlocrDevice, 'cuda');
  assert.equal(effective.ocrPageDpi, 250);
  assert.equal(effective.ocrKeepIntermediates, true);
  assert.equal(effective.ndlocrEnableTcy, true);
});

test('loadApiSettings strips unknown legacy fields', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-settings-'));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'settings.json'), JSON.stringify({ removedProviderKey: 'secret', ndlocrDevice: 'cpu' }), 'utf8');
  assert.deepEqual(await loadApiSettings(dir), { ndlocrDevice: 'cpu' });
});

test('saveApiSettings rejects invalid local settings', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-settings-invalid-'));
  await assert.rejects(() => saveApiSettings(dir, { ndlocrDevice: 'tpu' }), /Invalid enum value/);
  await assert.rejects(() => saveApiSettings(dir, { ocrPageDpi: 12 }), /greater than or equal to 72/);
});

test('normalizeJobRequest preserves standalone local OCR settings', () => {
  const request = normalizeJobRequest('ocr-materials', {
    inputDir: '/data/downloads/materials',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 250,
    ocrKeepIntermediates: true,
  });
  assert.deepEqual(request, {
    inputDir: '/data/downloads/materials',
    ocrForce: false,
    ndlocrCommand: 'ndlocr-lite',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 250,
    ocrKeepIntermediates: true,
    ndlocrEnableTcy: true,
  });
});

test('normalizeJobRequest rejects unsupported OCR provider fields', () => {
  const removedField = ['ocr', 'Backend'].join('');
  assert.throws(() => normalizeJobRequest('ocr-materials', { inputDir: '/tmp', [removedField]: 'remote' }), /Unsupported request field/);
});

test('normalizeJobRequest defaults local OCR values', () => {
  const request = normalizeJobRequest('ocr-materials', {});
  assert.equal(request.ndlocrCommand, 'ndlocr-lite');
  assert.equal(request.ndlocrDevice, 'cpu');
  assert.equal(request.ocrPageDpi, 300);
  assert.equal(request.ocrKeepIntermediates, false);
  assert.equal(request.ndlocrEnableTcy, true);
});
