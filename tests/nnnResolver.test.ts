import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NnnClient } from '../src/services/nnnClient.js';
import { resolveCourseLessonsForClient } from '../src/services/nnnResolver.js';

test('resolveCourseLessonsForClient retains every confirmation test in selected chapter order', async () => {
  const client = {
    getCourseChapters: async () => ({
      courseTitle: 'Course',
      chapters: [{ id: 10, title: 'One', order: 1 }, { id: 20, title: 'Two', order: 2 }],
    }),
    getChapterDetails: async (_courseId: number, chapterId: number) => ({
      title: chapterId === 10 ? 'One resolved' : 'Two resolved',
      sections: [{
        id: chapterId + 1,
        title: `確認テスト ${chapterId}`,
        kind: 'exercise',
        contentUrl: `https://www.nnn.ed.nico/test/${chapterId + 1}`,
      }],
    }),
  } as unknown as NnnClient;

  const structure = await resolveCourseLessonsForClient(client, {
    courseId: 1,
    chapterIds: [10, 20],
    maxConcurrency: 2,
    limitLessons: 0,
  });

  assert.deepEqual(structure.confirmationTests, [
    {
      chapterId: 10,
      testId: 11,
      chapterTitle: 'One resolved',
      title: '確認テスト 10',
      contentUrl: 'https://www.nnn.ed.nico/test/11',
    },
    {
      chapterId: 20,
      testId: 21,
      chapterTitle: 'Two resolved',
      title: '確認テスト 20',
      contentUrl: 'https://www.nnn.ed.nico/test/21',
    },
  ]);
  assert.deepEqual(structure.lessons, []);
});
