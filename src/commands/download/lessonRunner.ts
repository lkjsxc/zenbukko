import fs from 'node:fs/promises';
import path from 'node:path';
import type { CourseLesson } from '../../services/nnnClient.js';
import type { DownloadCommandParams } from './types.js';
import type { ChapterMarkdown } from './chapterMarkdown.js';
import { lessonItems, type WorkItem } from './lessonItems.js';
import { downloadAllMaterials } from './materialsRunner.js';
import { processMediaItem } from './mediaRunner.js';
import { ocrAllMaterials } from './ocrRunner.js';

export async function downloadResolvedLessons(ctx: {
  params: DownloadCommandParams;
  lessons: CourseLesson[];
  courseDir: string;
  headers: Record<string, string>;
  chapterDirNameForId: (chapterId: number) => string;
  chapterMarkdown: ChapterMarkdown;
}): Promise<Array<{ lesson: CourseLesson; outFilePath: string }>> {
  const downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> = [];
  const workItems = await buildWorkItems(ctx);
  const materialsDirs = ctx.params.materials ? await downloadAllMaterials(workItems) : [];
  for (const item of workItems) {
    await processMediaItem(item);
    downloaded.push({ lesson: item.lesson, outFilePath: item.outFilePath });
  }
  if (ctx.params.ocrMaterials) await ocrAllMaterials(ctx.params, materialsDirs, ctx.courseDir);
  return downloaded;
}

async function buildWorkItems(ctx: {
  params: DownloadCommandParams;
  lessons: CourseLesson[];
  courseDir: string;
  headers: Record<string, string>;
  chapterDirNameForId: (chapterId: number) => string;
  chapterMarkdown: ChapterMarkdown;
}): Promise<WorkItem[]> {
  const workItems: WorkItem[] = [];
  const chapterLessonIndex = new Map<number, number>();
  for (const lesson of ctx.lessons) {
    const lessonIndex = (chapterLessonIndex.get(lesson.chapterId) ?? 0) + 1;
    chapterLessonIndex.set(lesson.chapterId, lessonIndex);
    const lessonDir = path.join(ctx.courseDir, ctx.chapterDirNameForId(lesson.chapterId), String(lessonIndex).padStart(2, '0'));
    await fs.mkdir(lessonDir, { recursive: true });
    for (const item of lessonItems(lesson)) {
      const outFilePath = path.join(lessonDir, `lesson-${lesson.lessonId}${item.suffix}.ts`);
      workItems.push({ ...ctx, lesson, item, lessonIndex, outFilePath });
    }
  }
  return workItems;
}
