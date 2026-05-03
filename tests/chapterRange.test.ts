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

test('mapChapterOrdinalsToIds uses the provided display order', () => {
  const ids = mapChapterOrdinalsToIds(
    [1, 3],
    [
      { id: 30 },
      { id: 10 },
      { id: 20 },
    ],
  );
  assert.deepEqual(ids, [30, 20]);
});

test('mapChapterOrdinalsToIds does not sort missing order fields by id', () => {
  const ids = mapChapterOrdinalsToIds(
    [1, 2, 3, 4, 5],
    [
      { id: 1082427383 },
      { id: 958863356 },
      { id: 1798471593 },
      { id: 628108313 },
      { id: 2117733272 },
    ],
  );
  assert.deepEqual(ids, [1082427383, 958863356, 1798471593, 628108313, 2117733272]);
});
