import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseChapterDetails } from '../src/services/nnnSchemas.js';

test('parseChapterDetails recognizes report sections with an authenticated content URL', () => {
  const details = parseChapterDetails({
    chapter: {
      title: 'Chapter',
      class_headers: [{
        sections: [
          { id: 1, title: '講義', resource_type: 'lesson' },
          { id: 2, title: 'レポート課題', resource_type: 'guide', content_url: 'https://www.nnn.ed.nico/contents/links/2' },
          { id: 3, title: '確認テスト', resource_type: 'exercise', content_url: 'https://www.nnn.ed.nico/contents/exercises/3' },
          { id: 4, title: '章末小テスト', resource_type: 'guide', content_url: 'https://www.nnn.ed.nico/contents/exercises/4' },
        ],
      }],
    },
  });

  assert.equal(details.title, 'Chapter');
  assert.deepEqual(details.sections, [
    { id: 1, title: '講義', kind: 'lesson' },
    { id: 2, title: 'レポート課題', kind: 'report', contentUrl: 'https://www.nnn.ed.nico/contents/links/2' },
    { id: 3, title: '確認テスト', kind: 'exercise', contentUrl: 'https://www.nnn.ed.nico/contents/exercises/3' },
    { id: 4, title: '章末小テスト', kind: 'exercise', contentUrl: 'https://www.nnn.ed.nico/contents/exercises/4' },
  ]);
});
