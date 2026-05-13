import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeMarkdown } from '../src/services/geminiOcrMarkdown.js';
import { planOcrTasks } from '../src/services/geminiOcrPlan.js';
import { ocrMaterialsCommand } from '../src/services/geminiOcr.js';
import { localOptions } from '../src/services/ocr/localRunner.js';

test('normalizeMarkdown removes fenced markdown wrapper', () => {
  assert.equal(normalizeMarkdown('```markdown\n# Title\n```\n'), '# Title\n');
});

test('planOcrTasks skips existing markdown and auto-selects batch for multiple tasks', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-'));
  const one = path.join(dir, 'one.pdf');
  const two = path.join(dir, 'two.pdf');
  await fs.writeFile(one, 'pdf one\n', 'utf8');
  await fs.writeFile(two, 'pdf two\n', 'utf8');
  await fs.writeFile(one.replace(/\.pdf$/, '_ocr.md'), 'done\n', 'utf8');

  const plan = await planOcrTasks({ pdfs: [one, two], force: false, mode: 'auto' });
  assert.equal(plan.mode, 'flex');
  assert.deepEqual(plan.skipped.map((t) => path.basename(t.pdfPath)), ['one.pdf']);
  assert.deepEqual(plan.tasks.map((t) => path.basename(t.pdfPath)), ['two.pdf']);

  const forced = await planOcrTasks({ pdfs: [one, two], force: true, mode: 'auto' });
  assert.equal(forced.mode, 'batch');
});

test('planOcrTasks reruns OCR when markdown is older than regenerated PDF', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-stale-'));
  const pdf = path.join(dir, 'slide.pdf');
  const markdown = pdf.replace(/\.pdf$/, '_ocr.md');
  await fs.writeFile(markdown, 'old blank result\n', 'utf8');
  await fs.writeFile(pdf, 'new pdf\n', 'utf8');
  const old = new Date(Date.now() - 60_000);
  const now = new Date();
  await fs.utimes(markdown, old, old);
  await fs.utimes(pdf, now, now);

  const plan = await planOcrTasks({ pdfs: [pdf], force: false, mode: 'auto' });
  assert.deepEqual(plan.skipped, []);
  assert.deepEqual(plan.tasks.map((t) => path.basename(t.pdfPath)), ['slide.pdf']);
});

test('auto backend records explicit failure when local tools are unavailable and no Gemini key exists', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-auto-'));
  const pdf = path.join(dir, 'slide.pdf');
  await fs.writeFile(pdf, 'fake pdf for preflight\n', 'utf8');

  const result = await ocrMaterialsCommand({
    inputDir: dir,
    backend: 'auto',
    force: true,
    ndlocrCommand: path.join(dir, 'missing-ndlocr-lite'),
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined },
  });

  assert.equal(result.backend, 'auto');
  assert.equal(result.results[0]?.status, 'failed');
  assert.equal(result.results[0]?.backend, 'auto');
  assert.equal(result.results[0]?.attempts?.[0]?.status, 'skipped');
  assert.match(result.results[0]?.message ?? '', /no API key/i);
});

test('local OCR options default to 300 DPI with TCY enabled', () => {
  const opts = localOptions({ inputDir: '.', backend: 'auto', force: false, logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined } });
  assert.equal(opts.pageDpi, 300);
  assert.equal(opts.enableTcy, true);
});
