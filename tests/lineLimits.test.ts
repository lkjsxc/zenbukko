import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLineLimits, countLines } from '../src/development/lineLimits.js';

test('countLines handles trailing newline and empty files', () => {
  assert.equal(countLines(''), 0);
  assert.equal(countLines('a'), 1);
  assert.equal(countLines('a\n'), 1);
  assert.equal(countLines('a\nb'), 2);
});

test('checkLineLimits reports docs and source violations', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-lines-'));
  await fs.mkdir(path.join(root, 'docs'), { recursive: true });
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs', 'too-long.md'), 'a\nb\n', 'utf8');
  await fs.writeFile(path.join(root, 'src', 'too-long.ts'), 'a\nb\nc\n', 'utf8');

  const violations = await checkLineLimits({ root, docsLimit: 1, sourceLimit: 2 });
  assert.deepEqual(
    violations.map((v) => [v.file, v.kind, v.lines, v.limit]),
    [
      [path.join('docs', 'too-long.md'), 'docs', 2, 1],
      [path.join('src', 'too-long.ts'), 'source', 3, 2],
    ],
  );
});
