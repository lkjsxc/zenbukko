import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rebuildChapterOcr } from '../src/services/chapterOcr.js';

const logger = { info: () => undefined, warn: () => undefined };

test('rebuildChapterOcr writes lesson-ordered chapter OCR with demoted headings', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-chapter-ocr-'));
  const chapterDir = path.join(root, 'course-1', '01');
  await writeMaterial(chapterDir, '02', 'lesson-222_materials', 999, '# lesson-222\n\n## Later\n\nbody later\n');
  await writeMaterial(chapterDir, '01', 'lesson-111_part-2_materials', 999, '# lesson-111 part 2\n\n## Extra\n\npart two\n');
  await writeMaterial(chapterDir, '01', 'lesson-111_materials', 999, '# lesson-111\n\n## Intro\n\n### Detail\n\nbody one\n');

  const result = await rebuildChapterOcr({ inputDir: root, logger });
  const outPath = path.join(chapterDir, 'chapter-999_ocr.md');
  const markdown = await fs.readFile(outPath, 'utf8');

  assert.deepEqual(result.written, [outPath]);
  assert.match(markdown, /^## 01 lesson-111\n\n### Intro\n\n#### Detail\n\nbody one\n\n### Extra\n\npart two\n\n## 02 lesson-222/m);
  assert.doesNotMatch(markdown, /^# /m);
});

test('rebuildChapterOcr falls back to transcript chapter id and skips empty OCR', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-chapter-ocr-fallback-'));
  const chapterDir = path.join(root, 'course-1', '02');
  await fs.mkdir(chapterDir, { recursive: true });
  await fs.writeFile(path.join(chapterDir, 'chapter-12345_transcription.md'), 'transcript\n', 'utf8');
  await writeMaterial(chapterDir, '01', 'lesson-333_materials', undefined, '# lesson-333\n\n## Fallback\n\nok\n');
  await writeMaterial(chapterDir, '02', 'lesson-444_materials', 12345, '  \n');

  const result = await rebuildChapterOcr({ inputDir: chapterDir, logger });
  const markdown = await fs.readFile(path.join(chapterDir, 'chapter-12345_ocr.md'), 'utf8');

  assert.equal(result.written.length, 1);
  assert.match(markdown, /^## 01 lesson-333\n\n### Fallback\n\nok\n$/);
  assert.doesNotMatch(markdown, /lesson-444/);
});

async function writeMaterial(
  chapterDir: string,
  lessonDirName: string,
  materialDirName: string,
  chapterId: number | undefined,
  markdown: string,
): Promise<void> {
  const materialDir = path.join(chapterDir, lessonDirName, materialDirName);
  await fs.mkdir(materialDir, { recursive: true });
  if (chapterId) {
    const manifest = { referencePages: [{ url: `https://example.test/courses/1/chapters/${chapterId}/movies/1/references` }] };
    await fs.writeFile(path.join(materialDir, 'materials_manifest.json'), JSON.stringify(manifest), 'utf8');
  }
  await fs.writeFile(path.join(materialDir, 'materials_ocr.md'), markdown, 'utf8');
}
