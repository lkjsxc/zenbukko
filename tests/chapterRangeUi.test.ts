import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ordinalsToRange, rangeToOrdinals } from '../web-ui/src/utils/chapterRange.ts';

test('ordinalsToRange compresses contiguous runs', () => {
  assert.equal(ordinalsToRange([1, 3, 4, 5]), '1,3-5');
  assert.equal(ordinalsToRange([1, 2, 3]), '1-3');
});

test('rangeToOrdinals expands segments', () => {
  assert.deepEqual(rangeToOrdinals('1,3-5'), [1, 3, 4, 5]);
});

test('round trip ordinals', () => {
  const input = [2, 4, 5, 6, 9];
  assert.deepEqual(rangeToOrdinals(ordinalsToRange(input)), input);
});
