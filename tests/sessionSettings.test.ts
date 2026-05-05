import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSessionPrefill, parseStoredSession } from '../src/session/sessionStore.js';
import { mergeWebSettings } from '../src/web/settings.js';
import { normalizeJobRequest } from '../src/web/requests.js';
import { DEFAULT_GEMINI_MODEL } from '../src/geminiDefaults.js';
import type { AppConfig } from '../src/config.js';

const cfg: AppConfig = {
  sessionPath: '/data/session.json',
  outputDir: '/data/downloads',
  logLevel: 'info',
  puppeteerHeadless: true,
  geminiApiKey: 'env-key',
  geminiModel: 'env-model',
  ocrMode: 'auto',
  ocrServiceTier: 'flex',
  ocrRetries: 3,
  ocrTimeoutMs: 900_000,
  webPort: 8787,
};

test('buildSessionPrefill returns normalized formatted session text', () => {
  const session = parseStoredSession({ cookies: 'a=b', created_at: '2026-01-01T00:00:00.000Z' });
  const payload = buildSessionPrefill(session);
  assert.equal(payload.exists, true);
  assert.match(payload.text, /"cookieHeader": "a=b"/);
});

test('mergeWebSettings gives saved browser values precedence over env defaults', () => {
  const effective = mergeWebSettings(cfg, {
    geminiApiKey: 'saved-key',
    geminiModel: 'saved-model',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    chapterRange: '1-2',
    ocrRetries: 5,
    ocrTimeoutMs: 123,
  });
  assert.deepEqual(effective, {
    geminiApiKey: 'saved-key',
    geminiModel: 'saved-model',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    chapterRange: '1-2',
    ocrRetries: 5,
    ocrTimeoutMs: 123,
  });
});

test('normalizeJobRequest preserves standalone OCR settings without secrets', () => {
  const request = normalizeJobRequest('ocr-materials', {
    inputDir: '/data/downloads/materials',
    geminiApiKey: 'secret',
    ocrModel: 'model-x',
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    ocrRetries: 7,
    ocrTimeoutMs: 456,
  });
  assert.deepEqual(request, {
    inputDir: '/data/downloads/materials',
    ocrModel: 'model-x',
    ocrForce: false,
    ocrMode: 'batch',
    ocrServiceTier: 'standard',
    ocrRetries: 7,
    ocrTimeoutMs: 456,
  });
});

test('normalizeJobRequest uses the default Gemini model when OCR model is omitted', () => {
  const request = normalizeJobRequest('ocr-materials', {
    inputDir: '/data/downloads/materials',
  });
  assert.equal(request.ocrModel, DEFAULT_GEMINI_MODEL);
});
