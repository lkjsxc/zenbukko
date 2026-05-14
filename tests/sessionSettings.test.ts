import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSessionPrefill,
  buildSessionWriteError,
  parseStoredSession,
} from '../src/session/sessionStore.js';
import { mergeApiSettings } from '../src/api/settings.js';
import { normalizeJobRequest } from '../src/api/requests.js';
import { DEFAULT_GEMINI_MODEL } from '../src/geminiDefaults.js';
import type { AppConfig } from '../src/config.js';

const cfg: AppConfig = {
  sessionPath: '/data/session.json',
  outputDir: '/data/downloads',
  logLevel: 'info',
  puppeteerHeadless: true,
  geminiApiKey: 'env-key',
  geminiModel: 'env-model',
  ocrBackend: 'gemini',
  ocrMode: 'auto',
  ocrServiceTier: 'flex',
  ocrRetries: 3,
  ocrTimeoutMs: 900_000,
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

test('mergeApiSettings gives saved browser values precedence over env defaults', () => {
  const effective = mergeApiSettings(cfg, {
    geminiApiKey: 'saved-key',
    geminiModel: 'saved-model',
    ocrBackend: 'local',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    ndlocrDevice: 'cpu',
    chapterRange: '1-2',
    ocrRetries: 5,
    ocrTimeoutMs: 123,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: false,
  });
  assert.deepEqual(effective, {
    geminiApiKey: 'saved-key',
    geminiModel: 'saved-model',
    ocrBackend: 'local',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    chapterRange: '1-2',
    ocrRetries: 5,
    ocrTimeoutMs: 123,
    ndlocrCommand: 'ndlocr-cmd',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 250,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: false,
  });
});

test('mergeApiSettings uses configured OCR command defaults when request settings are not saved', () => {
  const effective = mergeApiSettings(cfg, { chapterRange: '1-3' });
  assert.equal(effective.ocrBackend, 'gemini');
  assert.equal(effective.ndlocrCommand, 'ndlocr-cmd');
  assert.equal(effective.ocrPageDpi, 250);
  assert.equal(effective.ocrKeepIntermediates, true);
  assert.equal(effective.ndlocrEnableTcy, true);
});

test('normalizeJobRequest preserves standalone OCR settings without secrets', () => {
  const request = normalizeJobRequest('ocr-materials', {
    inputDir: '/data/downloads/materials',
    geminiApiKey: 'secret',
    ocrModel: 'model-x',
    ocrBackend: 'gemini',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    ocrRetries: 7,
    ocrTimeoutMs: 456,
    ndlocrDevice: 'cpu',
    ocrPageDpi: 250,
  });
  assert.deepEqual(request, {
    inputDir: '/data/downloads/materials',
    ocrBackend: 'gemini',
    ocrModel: 'model-x',
    ocrForce: false,
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    ocrRetries: 7,
    ocrTimeoutMs: 456,
    ndlocrCommand: 'ndlocr-lite',
    ndlocrDevice: 'cpu',
    ocrPageDpi: 250,
    ocrKeepIntermediates: false,
    ndlocrEnableTcy: true,
  });
});

test('normalizeJobRequest uses the default Gemini model when OCR model is omitted', () => {
  const request = normalizeJobRequest('ocr-materials', {
    inputDir: '/data/downloads/materials',
  });
  assert.equal(request.ocrModel, DEFAULT_GEMINI_MODEL);
});

test('normalizeJobRequest defaults OCR backend to auto for omitted values', () => {
  const request = normalizeJobRequest('ocr-materials', {});
  assert.equal(request.ocrBackend, 'auto');
  assert.equal(request.ndlocrCommand, 'ndlocr-lite');
  assert.equal(request.ndlocrDevice, 'cpu');
  assert.equal(request.ocrPageDpi, 300);
  assert.equal(request.ocrKeepIntermediates, false);
  assert.equal(request.ndlocrEnableTcy, true);
});
