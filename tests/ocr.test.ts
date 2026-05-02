import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeMarkdown } from '../src/services/geminiOcrMarkdown.js';
import { planOcrTasks } from '../src/services/geminiOcrPlan.js';

test('normalizeMarkdown removes fenced markdown wrapper', () => {
  assert.equal(normalizeMarkdown('```markdown\n# Title\n```\n'), '# Title\n');
});

test('planOcrTasks skips existing markdown and auto-selects batch for multiple tasks', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-'));
  const one = path.join(dir, 'one.pdf');
  const two = path.join(dir, 'two.pdf');
  await fs.writeFile(one.replace(/\.pdf$/, '_ocr.md'), 'done\n', 'utf8');

  const plan = await planOcrTasks({ pdfs: [one, two], force: false, mode: 'auto' });
  assert.equal(plan.mode, 'flex');
  assert.deepEqual(plan.skipped.map((t) => path.basename(t.pdfPath)), ['one.pdf']);
  assert.deepEqual(plan.tasks.map((t) => path.basename(t.pdfPath)), ['two.pdf']);

  const forced = await planOcrTasks({ pdfs: [one, two], force: true, mode: 'auto' });
  assert.equal(forced.mode, 'batch');
});
