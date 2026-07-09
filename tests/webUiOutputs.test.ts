import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPreviewableOutput, matchesOutputFilter } from '../web-ui/src/utils/outputs.ts';

test('output filters use documented extension groups', () => {
  assert.equal(matchesOutputFilter('notes/course.MD', 'md'), true);
  assert.equal(matchesOutputFilter('audio/chapter.srt', 'transcript'), true);
  assert.equal(matchesOutputFilter('audio/chapter.vtt', 'transcript'), true);
  assert.equal(matchesOutputFilter('book.pdf', 'transcript'), false);
  assert.equal(matchesOutputFilter('book.pdf', 'all'), true);
});

test('only API-supported text files are previewable', () => {
  for (const path of ['a.md', 'a.TXT', 'a.srt', 'a.vtt', 'a.json', 'a.html']) {
    assert.equal(isPreviewableOutput(path), true, path);
  }
  for (const path of ['a.pdf', 'a.mp4', 'a.zip', 'README']) {
    assert.equal(isPreviewableOutput(path), false, path);
  }
});
