import path from 'node:path';
import fs from 'node:fs/promises';
import { buildCookieHeader, SessionStore } from '../session/sessionStore.js';
import { safeBasename } from '../utils/fs.js';
import { NnnClient, type CourseLesson } from '../services/nnnClient.js';
import { preflightTranscription } from './transcribe.js';
import { createChapterDirNamer } from './download/chapterDirs.js';
import { selectLessons } from './download/lessonSelection.js';
import { downloadResolvedLessons } from './download/lessonRunner.js';
import { ChapterMarkdown } from './download/chapterMarkdown.js';
import type { DownloadCommandParams } from './download/types.js';
import { mapChapterOrdinalsToIds, parseChapterRange } from '../services/chapterRange.js';

export async function downloadCommand(
  params: DownloadCommandParams,
): Promise<{ downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> }> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);

  const client = new NnnClient(session);
  if (params.chapterRange && params.chapters && params.chapters.length > 0) {
    throw new Error('Use either chapterRange or explicit chapters, not both.');
  }

  const courseChapters = await client.getCourseChapters(params.courseId);
  const rangeChapterIds = params.chapterRange
    ? mapChapterOrdinalsToIds(parseChapterRange(params.chapterRange), courseChapters.chapters)
    : undefined;
  const resolveArgs: { courseId: number; maxConcurrency: number; chapterIds?: number[]; limitLessons?: number } = {
    courseId: params.courseId,
    maxConcurrency: params.maxConcurrency,
  };
  if (rangeChapterIds && rangeChapterIds.length > 0) resolveArgs.chapterIds = rangeChapterIds;
  else if (params.chapters && params.chapters.length > 0) resolveArgs.chapterIds = params.chapters;
  if (params.firstLectureOnly) resolveArgs.limitLessons = 1;

  const structure = await client.resolveCourseLessons(resolveArgs);
  const lessons = selectLessons(structure, params);
  if (lessons.length === 0) throw new Error('No lessons resolved to download.');

  if ((structure.skippedLessons ?? []).length > 0) {
    params.logger.warn(`Skipped ${(structure.skippedLessons ?? []).length} lesson(s) that could not be resolved (no video URL, etc).`);
  }
  if (params.transcribe) await preflightTranscription({ model: params.transcribeModel, requireFfmpeg: true });

  const selectedChapterIds = new Set<number>(structure.chapters.map((c) => c.id));
  params.logger.info(
    `Resolved ${lessons.length} lesson(s) across ${selectedChapterIds.size} selected chapter(s) (${courseChapters.chapters.length} total chapter(s) in course).`,
  );

  const headers: Record<string, string> = {
    'user-agent': session.userAgent ?? 'zenbukko/2.0',
    referer: 'https://www.nnn.ed.nico/',
  };
  const cookieForWww = buildCookieHeader(session, new URL('https://www.nnn.ed.nico/'));
  if (cookieForWww) headers.cookie = cookieForWww;

  const courseDir = path.join(params.outputDir, safeBasename(`course-${structure.courseId}`));
  await fs.mkdir(courseDir, { recursive: true });
  const namer = createChapterDirNamer(courseChapters.chapters, params.logger);
  const chapterMarkdown = new ChapterMarkdown(namer.chapterDirNameForId);

  const downloaded = await downloadResolvedLessons({
    params,
    lessons,
    courseDir,
    headers,
    chapterDirNameForId: namer.chapterDirNameForId,
    chapterMarkdown,
  });

  if (params.transcribe) {
    await chapterMarkdown.writeAll({
      courseDir,
      transcribeFormat: params.transcribeFormat,
      logger: params.logger,
    });
  }

  params.logger.info('All downloads finished.');
  return { downloaded };
}
