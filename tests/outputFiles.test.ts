import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveOutputFile } from '../src/api/outputPath.js';

test('resolveOutputFile accepts relative paths under output root', () => {
  const resolved = resolveOutputFile('/data/downloads', 'course-1/chapter.md');
  assert.ok(resolved.endsWith('course-1/chapter.md'));
});

test('resolveOutputFile rejects traversal', () => {
  assert.throws(() => resolveOutputFile('/data/downloads', '../etc/passwd'));
  assert.throws(() => resolveOutputFile('/data/downloads', '/etc/passwd'));
  assert.throws(() => resolveOutputFile('/data/downloads', ''));
});
