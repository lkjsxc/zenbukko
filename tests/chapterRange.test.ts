import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapChapterOrdinalsToIds, parseChapterRange } from '../src/services/chapterRange.js';

test('parseChapterRange supports singles, ranges, and duplicate collapse', () => {
  assert.deepEqual(parseChapterRange('1,3-5,4'), [1, 3, 4, 5]);
});

test('parseChapterRange rejects invalid input', () => {
  assert.throws(() => parseChapterRange('0'), /Invalid chapter ordinal/);
  assert.throws(() => parseChapterRange('3-1'), /end must be/);
  assert.throws(() => parseChapterRange('1,,2'), /empty segment/);
});

test('mapChapterOrdinalsToIds uses one-based course order', () => {
  const ids = mapChapterOrdinalsToIds(
    [1, 3],
    [
      { id: 30, order: 3 },
      { id: 10, order: 1 },
      { id: 20, order: 2 },
    ],
  );
  assert.deepEqual(ids, [10, 30]);
});
