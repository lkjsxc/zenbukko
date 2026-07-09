import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveOcrInputDir } from '../src/api/jobRunner.js';
import { normalizeJobRequest } from '../src/api/requests.js';
import { headersForTarget, fetchWithSafeRedirects } from '../src/utils/http.js';
import { formatListenError } from '../src/utils/listen.js';
import { normalizeApiUrl, upstreamUrl } from '../src/web/proxy.js';

test('download job URLs stay on authenticated NNN HTTPS origins', () => {
  const request = normalizeJobRequest('download', {
    learningUrl: 'https://www.nnn.ed.nico/courses/12345',
    maxConcurrency: 32,
    ocrPageDpi: 600,
  });
  assert.equal(request.courseId, 12345);
  assert.throws(
    () => normalizeJobRequest('download', { learningUrl: 'https://example.test/courses/12345' }),
    /nnn\.ed\.nico/,
  );
  assert.throws(
    () => normalizeJobRequest('download', { learningUrl: 'http://www.nnn.ed.nico/courses/12345' }),
    /HTTPS/,
  );
});

test('job request bounds reject unsafe concurrency and OCR settings', () => {
  assert.throws(
    () => normalizeJobRequest('download-all', { maxConcurrency: 0 }),
    /maxConcurrency/,
  );
  assert.throws(
    () => normalizeJobRequest('ocr-materials', { ocrPageDpi: 601 }),
    /ocrPageDpi/,
  );
  assert.throws(
    () => normalizeJobRequest('ocr-materials', { ndlocrDevice: 'remote' }),
    /ndlocrDevice/,
  );
});

test('API proxy URL cannot change upstream origin or contain credentials', () => {
  assert.equal(normalizeApiUrl('http://127.0.0.1:8788'), 'http://127.0.0.1:8788/');
  assert.throws(() => normalizeApiUrl('file:///tmp/api.sock'), /http or https/);
  assert.throws(() => normalizeApiUrl('http://user:pass@127.0.0.1:8788'), /credentials/);

  const target = new URL(upstreamUrl('http://127.0.0.1:8788', { originalUrl: '//evil.test/steal?x=1' }));
  assert.equal(target.origin, 'http://127.0.0.1:8788');
  assert.equal(target.pathname, '/steal');
});

test('authenticated headers are removed before cross-origin material fetches', async () => {
  const headers = headersForTarget(
    { Cookie: 'private', Authorization: 'private', Accept: 'application/pdf' },
    new URL('https://www.nnn.ed.nico/material'),
    new URL('https://cdn.example.test/material.pdf'),
  );
  assert.deepEqual(headers, { Accept: 'application/pdf' });

  const cookies: Array<string | null> = [];
  const fakeFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    cookies.push(new Headers(init?.headers).get('cookie'));
    const url = String(input);
    return url.includes('www.nnn.ed.nico')
      ? new Response(null, { status: 302, headers: { location: 'https://cdn.example.test/file.pdf' } })
      : new Response('pdf');
  }) as typeof fetch;
  await fetchWithSafeRedirects(new URL('https://www.nnn.ed.nico/file'), {
    headers: { Cookie: 'private' },
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(cookies, ['private', null]);
  await assert.rejects(fetchWithSafeRedirects(new URL('file:///private/session.json')), /Unsupported download URL/);
});

test('API OCR input remains under the configured output root', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-job-input-'));
  const output = path.join(temp, 'downloads');
  const course = path.join(output, 'course-1');
  const outside = path.join(temp, 'private');
  await fs.mkdir(course, { recursive: true });
  await fs.mkdir(outside);

  assert.equal(await resolveOcrInputDir(output, 'course-1'), await fs.realpath(course));
  await assert.rejects(resolveOcrInputDir(output, outside), /escapes/);
});

test('listen errors provide an actionable port conflict message', () => {
  const cause = Object.assign(new Error('in use'), { code: 'EADDRINUSE' });
  assert.match(formatListenError('Core API', '127.0.0.1', 8788, cause).message, /既に使用/);
});
