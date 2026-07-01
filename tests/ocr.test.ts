import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeMarkdown } from '../src/services/ocr/text.js';
import { planOcrTasks } from '../src/services/ocr/plan.js';
import { ocrMaterialsCommand } from '../src/services/ocr/index.js';
import { localOptions } from '../src/services/ocr/localRunner.js';
import { preflightLocalOcr } from '../src/services/ocr/preflight.js';

test('normalizeMarkdown removes fenced markdown wrapper', () => {
  assert.equal(normalizeMarkdown('```markdown\n# Title\n```\n'), '# Title\n');
});

test('planOcrTasks skips existing fresh markdown', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-'));
  const one = path.join(dir, 'one.pdf');
  const two = path.join(dir, 'two.pdf');
  await fs.writeFile(one, 'pdf one\n', 'utf8');
  await fs.writeFile(two, 'pdf two\n', 'utf8');
  await fs.writeFile(one.replace(/\.pdf$/, '_ocr.md'), 'done\n', 'utf8');

  const plan = await planOcrTasks({ pdfs: [one, two], force: false });
  assert.deepEqual(plan.skipped.map((t) => path.basename(t.pdfPath)), ['one.pdf']);
  assert.deepEqual(plan.tasks.map((t) => path.basename(t.pdfPath)), ['two.pdf']);

  const forced = await planOcrTasks({ pdfs: [one, two], force: true });
  assert.deepEqual(forced.tasks.map((t) => path.basename(t.pdfPath)), ['one.pdf', 'two.pdf']);
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

  const plan = await planOcrTasks({ pdfs: [pdf], force: false });
  assert.deepEqual(plan.skipped, []);
  assert.deepEqual(plan.tasks.map((t) => path.basename(t.pdfPath)), ['slide.pdf']);
});

test('local command records preflight failure for each runnable PDF', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-local-'));
  const bin = path.join(dir, 'bin');
  await fs.mkdir(bin);
  await fs.writeFile(path.join(bin, 'pdftoppm'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  await fs.writeFile(path.join(dir, 'slide.pdf'), 'fake pdf for preflight\n', 'utf8');
  const oldPath = process.env.PATH;
  process.env.PATH = bin;
  try {
    const result = await ocrMaterialsCommand({
      inputDir: dir,
      force: true,
      ndlocrCommand: path.join(dir, 'missing-ocr-command'),
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined },
    });
    assert.equal(result.runner, 'local');
    assert.equal(result.results[0]?.status, 'failed');
    assert.equal(result.results[0]?.diagnosticCode, 'missing-ocr-command');
  } finally {
    process.env.PATH = oldPath;
  }
});

test('preflight reports missing and found local commands', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-preflight-'));
  const bin = path.join(dir, 'bin');
  await fs.mkdir(bin);
  await fs.writeFile(path.join(bin, 'pdftoppm'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  await fs.writeFile(path.join(bin, 'ocr-tool'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const oldPath = process.env.PATH;
  process.env.PATH = bin;
  try {
    const found = await preflightLocalOcr({ command: 'ocr-tool', device: 'cpu', pageDpi: 300, keepIntermediates: false, enableTcy: true });
    assert.equal(found.ok, true);
    assert.match(found.ocrCommandPath ?? '', /ocr-tool/);
    const missing = await preflightLocalOcr({ command: 'missing-tool', device: 'cpu', pageDpi: 300, keepIntermediates: false, enableTcy: true });
    assert.equal(missing.ok, false);
    assert.equal(missing.diagnostics[0]?.code, 'missing-ocr-command');
  } finally {
    process.env.PATH = oldPath;
  }
});

test('local OCR options default to 300 DPI with TCY enabled', () => {
  const opts = localOptions({});
  assert.equal(opts.pageDpi, 300);
  assert.equal(opts.enableTcy, true);
});
