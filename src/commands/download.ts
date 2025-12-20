import path from 'node:path';
import fs from 'node:fs/promises';
import type { Logger } from '../utils/log.js';
import { buildCookieHeader, SessionStore } from '../session/sessionStore.js';
import { safeBasename } from '../utils/fs.js';
import { NnnClient, type CourseLesson } from '../services/nnnClient.js';
import { downloadHlsToFile } from '../downloader/hls.js';
import { preflightTranscription, transcribeCommand } from './transcribe.js';
import { downloadLessonMaterials } from '../services/materials.js';

export async function downloadCommand(params: {
  sessionPath: string;
  outputDir: string;
  courseId: number;
  chapters?: number[];
  maxConcurrency: number;
  firstLectureOnly: boolean;
  transcribe: boolean;
  materials: boolean;
  logger: Logger;
}): Promise<{ downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> }> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) {
    throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);
  }

  const client = new NnnClient(session);

  const resolveArgs: {
    courseId: number;
    maxConcurrency: number;
    chapterIds?: number[];
    limitLessons?: number;
  } = {
    courseId: params.courseId,
    maxConcurrency: params.maxConcurrency,
  };
  if (params.chapters && params.chapters.length > 0) {
    resolveArgs.chapterIds = params.chapters;
  }
  if (params.firstLectureOnly) resolveArgs.limitLessons = 1;

  const structure = await client.resolveCourseLessons(resolveArgs);

  const lessons = params.firstLectureOnly ? structure.lessons.slice(0, 1) : structure.lessons;
  if (lessons.length === 0) throw new Error('No lessons resolved to download.');

  if (structure.skippedLessons && structure.skippedLessons.length > 0) {
    params.logger.warn(`Skipped ${structure.skippedLessons.length} lesson(s) that could not be resolved (no video URL, etc).`);
  }

  if (params.transcribe) {
    await preflightTranscription({ model: 'base', requireFfmpeg: true });
  }

  // Use stable, ID-based folder names to avoid changes when titles differ.
  const coursePart = safeBasename(`course-${structure.courseId}`);

  // Backward-compat: earlier versions used courseTitle as the folder.
  const legacyCoursePart = safeBasename(structure.courseTitle ?? `course-${structure.courseId}`);
  if (legacyCoursePart !== coursePart) {
    const legacyCourseDir = path.join(params.outputDir, legacyCoursePart);
    const courseDir = path.join(params.outputDir, coursePart);

    const legacyExists = await fs
      .stat(legacyCourseDir)
      .then((s) => s.isDirectory())
      .catch(() => false);
    const newExists = await fs
      .stat(courseDir)
      .then((s) => s.isDirectory())
      .catch(() => false);

    if (legacyExists && !newExists) {
      params.logger.info(`Migrating downloads folder: ${legacyCourseDir} -> ${courseDir}`);
      try {
        await fs.rename(legacyCourseDir, courseDir);
      } catch (e) {
        params.logger.warn(`Failed to migrate downloads folder; will continue: ${(e as Error).message}`);
      }
    }
  }
  params.logger.info(
    `Resolved ${lessons.length} lesson(s) across ${structure.chapters.length} chapter(s).`,
  );

  const headers: Record<string, string> = {
    'user-agent': session.userAgent ?? 'zenbukko/2.0',
    referer: 'https://www.nnn.ed.nico/',
  };

  const cookieForWww = buildCookieHeader(session, new URL('https://www.nnn.ed.nico/'));
  if (cookieForWww) headers.cookie = cookieForWww;

  const downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> = [];

  // Download sequentially to keep the HLS downloader simple/reliable.
  // (Resolution concurrency is already applied when resolving lesson URLs.)
  for (const lesson of lessons) {
    const chapterPart = `chapter-${lesson.chapterId}`;
    const lessonPart = `lesson-${lesson.lessonId}`;

    const outFilePath = path.join(
      params.outputDir,
      coursePart,
      chapterPart,
      `${lessonPart}.ts`,
    );

    params.logger.info(`Downloading: ${lesson.chapterId}/${lesson.lessonId} -> ${outFilePath}`);

    const mediaExists = await fs
      .stat(outFilePath)
      .then((s) => s.isFile() && s.size > 0)
      .catch(() => false);

    if (mediaExists) {
      params.logger.info(`Media already exists, skipping download: ${outFilePath}`);
    } else {
      await downloadHlsToFile(new URL(lesson.videoUrl), {
        outFilePath,
        headers,
        onProgress: ({ segmentIndex, segmentCount }) => {
          if (segmentIndex === 1 || segmentIndex === segmentCount || segmentIndex % 100 === 0) {
            params.logger.info(`HLS segments: ${segmentIndex}/${segmentCount}`);
          }
        },
      });
    }

    if (params.materials) {
      const pages = lesson.referencePageUrls ?? [];
      if (pages.length === 0) {
        params.logger.warn(`No lesson reference URLs found; skipping materials: ${lesson.chapterId}/${lesson.lessonId}`);
      } else {
        const materialsDir = path.join(params.outputDir, coursePart, chapterPart, `${lessonPart}_materials`);
        params.logger.info(`Downloading materials (${pages.length} reference page(s)) to: ${materialsDir}`);
        await downloadLessonMaterials({ referencePageUrls: pages, outDir: materialsDir, headers, logger: params.logger });
      }
    }

    if (params.transcribe) {
      params.logger.info(`Transcribing: ${outFilePath}`);
      await transcribeCommand({
        inputPath: outFilePath,
        model: 'base',
        format: 'txt',
        logger: params.logger,
      });
    }

    downloaded.push({ lesson, outFilePath });
  }

  params.logger.info('All downloads finished.');
  return { downloaded };
}
