import path from 'node:path';
import fs from 'node:fs/promises';
import type { Logger } from '../utils/log.js';
import { buildCookieHeader, SessionStore } from '../session/sessionStore.js';
import { safeBasename, readTextFileIfExists } from '../utils/fs.js';
import { NnnClient, type CourseLesson } from '../services/nnnClient.js';
import { downloadHlsToFile } from '../downloader/hls.js';
import { preflightTranscription, transcribeCommand } from './transcribe.js';
import { downloadLessonMaterials } from '../services/materials.js';

export async function downloadCommand(params: {
  sessionPath: string;
  outputDir: string;
  courseId: number;
  chapters?: number[];
  lessonIds?: number[];
  maxConcurrency: number;
  firstLectureOnly: boolean;
  transcribe: boolean;
  transcribeModel: string;
  transcribeFormat: 'txt' | 'srt' | 'vtt';
  transcribeLanguage?: string;
  noSpeechThreshold?: number;
  maxSeconds?: number;
  materials: boolean;
  logger: Logger;
}): Promise<{ downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> }> {
  const pad2 = (n: number): string => String(n).padStart(2, '0');

  const isDir = async (p: string): Promise<boolean> =>
    fs
      .stat(p)
      .then((s) => s.isDirectory())
      .catch(() => false);

  const moveDirContentsBestEffort = async (srcDir: string, dstDir: string): Promise<boolean> => {
    // Returns true if srcDir can be removed (emptied), false if we had to leave anything behind.
    await fs.mkdir(dstDir, { recursive: true });

    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    let fullyMoved = true;

    for (const ent of entries) {
      const src = path.join(srcDir, ent.name);
      const dst = path.join(dstDir, ent.name);

      if (ent.isDirectory()) {
        const dstIsDir = await isDir(dst);
        if (!dstIsDir) {
          // Destination doesn't exist (or is not a directory) -> fast move.
          try {
            await fs.rename(src, dst);
            continue;
          } catch {
            // Fall through to recursive merge.
          }
        }

        const childFullyMoved = await moveDirContentsBestEffort(src, dst);
        if (childFullyMoved) {
          await fs.rmdir(src).catch(() => {
            fullyMoved = false;
          });
        } else {
          fullyMoved = false;
        }
        continue;
      }

      // Files/symlinks: move if there's no conflict.
      const dstExists = await fs
        .stat(dst)
        .then(() => true)
        .catch(() => false);
      if (dstExists) {
        fullyMoved = false;
        continue;
      }

      try {
        await fs.rename(src, dst);
      } catch {
        fullyMoved = false;
      }
    }

    return fullyMoved;
  };

  const migrateLegacyChapterDir = async (courseDir: string, chapterId: number, chapterDirName: string): Promise<void> => {
    const legacyName = `chapter-${chapterId}`;
    const legacyPath = path.join(courseDir, legacyName);
    const numericPath = path.join(courseDir, chapterDirName);

    const legacyExists = await isDir(legacyPath);
    if (!legacyExists) return;

    const numericExists = await isDir(numericPath);
    if (!numericExists) {
      try {
        await fs.rename(legacyPath, numericPath);
        params.logger.info(`Renamed legacy chapter folder: ${legacyName} -> ${chapterDirName}`);
        return;
      } catch (e) {
        params.logger.warn(
          `Failed to rename legacy chapter folder (${legacyName} -> ${chapterDirName}); will attempt merge: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Merge legacy contents into numeric folder best-effort.
    await fs.mkdir(numericPath, { recursive: true });
    const fullyMoved = await moveDirContentsBestEffort(legacyPath, numericPath);
    if (fullyMoved) {
      await fs.rmdir(legacyPath).catch(() => {
        params.logger.warn(`Legacy chapter folder not empty after merge, leaving in place: ${legacyPath}`);
      });
      params.logger.info(`Merged legacy chapter folder into numeric folder: ${legacyName} -> ${chapterDirName}`);
    } else {
      params.logger.warn(
        `Partially merged legacy chapter folder into numeric folder (some conflicts left behind): ${legacyName} -> ${chapterDirName}`,
      );
    }
  };

  type ChapterMarkdownLesson = {
    lessonIndex: number;
    lessonId: number;
    lessonTitle?: string;
    transcriptPaths: string[];
  };

  const chapterMarkdown = new Map<number, Map<number, ChapterMarkdownLesson>>();

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
  if (params.firstLectureOnly) {
    resolveArgs.limitLessons = 1;
  }

  const structure = await client.resolveCourseLessons(resolveArgs);

  // Chapter directories are stored as sequential numbers (01, 02, ...) based on
  // the *full course chapter order*.
  //
  // Why not based on the resolved chapter subset?
  // - If you download a subset now and another subset later, stable numbering prevents collisions.
  // - It also ensures we don't fall back to `chapter-<id>` if the resolved lesson list is ever out of sync.
  const courseChapters = await client.getCourseChapters(params.courseId);
  const chapterPadWidth = Math.max(2, String(courseChapters.chapters.length).length);
  const padChapter = (n: number): string => String(n).padStart(chapterPadWidth, '0');
  const chapterIndexById = new Map<number, number>();
  for (const [idx, chapter] of courseChapters.chapters.entries()) {
    chapterIndexById.set(chapter.id, idx + 1);
  }

  const chapterDirNameForId = (chapterId: number): string => {
    const index = chapterIndexById.get(chapterId);
    if (!index) {
      // Keep downloads working even if the chapter list is incomplete.
      // Prefer a numeric folder name over `chapter-<id>` so layout stays consistent.
      const fallbackIndex = chapterIndexById.size + 1;
      chapterIndexById.set(chapterId, fallbackIndex);
      params.logger.warn(
        `Chapter ID ${chapterId} was not found in course chapter list; using fallback numeric folder ${padChapter(fallbackIndex)}`,
      );
      return padChapter(fallbackIndex);
    }
    return padChapter(index);
  };

  const lessons = (() => {
    if (params.lessonIds && params.lessonIds.length > 0) {
      const requestedIds = params.lessonIds
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
        .map((v) => Math.trunc(v));

      const lessonById = new Map(structure.lessons.map((l) => [l.lessonId, l] as const));
      const missing = requestedIds.filter((id) => !lessonById.has(id));
      if (missing.length > 0) {
        const skippedDetails = (structure.skippedLessons ?? [])
          .filter((s) => missing.includes(s.lessonId))
          .map((s) => `${s.lessonId} (${s.reason})`);

        const suffix = skippedDetails.length > 0 ? `\nSkipped: ${skippedDetails.join(', ')}` : '';
        throw new Error(`Requested lesson-id(s) could not be resolved: ${missing.join(', ')}${suffix}`);
      }

      return requestedIds.map((id) => lessonById.get(id)!);
    }

    if (params.firstLectureOnly) return structure.lessons.slice(0, 1);
    return structure.lessons;
  })();

  if (lessons.length === 0) throw new Error('No lessons resolved to download.');

  if ((structure.skippedLessons ?? []).length > 0) {
    params.logger.warn(
      `Skipped ${(structure.skippedLessons ?? []).length} lesson(s) that could not be resolved (no video URL, etc).`,
    );
  }

  if (params.transcribe) {
    await preflightTranscription({ model: params.transcribeModel, requireFfmpeg: true });
  }

  const coursePart = safeBasename(`course-${structure.courseId}`);

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

  const downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> = [];

  const chapterLessonIndex = new Map<number, number>();
  const migratedChapters = new Set<number>();

  const courseDir = path.join(params.outputDir, coursePart);
  await fs.mkdir(courseDir, { recursive: true });

  for (const lesson of lessons) {
    const chapterDirName = chapterDirNameForId(lesson.chapterId);
    const lessonPart = `lesson-${lesson.lessonId}`;

    if (!migratedChapters.has(lesson.chapterId)) {
      migratedChapters.add(lesson.chapterId);
      await migrateLegacyChapterDir(courseDir, lesson.chapterId, chapterDirName);
    }

    const chapterDir = path.join(courseDir, chapterDirName);
    const lessonIndex = (chapterLessonIndex.get(lesson.chapterId) ?? 0) + 1;
    chapterLessonIndex.set(lesson.chapterId, lessonIndex);

    const lessonDirName = pad2(lessonIndex);
    const lessonDir = path.join(chapterDir, lessonDirName);

    await fs.mkdir(lessonDir, { recursive: true });

    const items = (lesson.videoItems && lesson.videoItems.length > 0
      ? lesson.videoItems
      : [
          {
            index: 1,
            videoUrl: lesson.videoUrl,
            ...(lesson.referencePageUrls ? { referencePageUrls: lesson.referencePageUrls } : {}),
          },
        ]);

    for (const item of items) {
      const needsSuffix = items.length > 1;
      const partSuffix = needsSuffix ? `_part-${item.index}` : '';
      const outFilePath = path.join(
        lessonDir,
        `${lessonPart}${partSuffix}.ts`,
      );

      params.logger.info(
        `Downloading: ${lesson.chapterId}/${lesson.lessonId}${needsSuffix ? ` (part ${item.index})` : ''} -> ${outFilePath}`,
      );

      const mediaExists = await fs
        .stat(outFilePath)
        .then((s) => s.isFile() && s.size > 0)
        .catch(() => false);

      if (mediaExists) {
        params.logger.info(`Media already exists, skipping download: ${outFilePath}`);
      } else {
        await downloadHlsToFile(new URL(item.videoUrl), {
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
        const pages = item.referencePageUrls ?? [];
        if (pages.length === 0) {
          params.logger.warn(
            `No lesson reference URLs found; skipping materials: ${lesson.chapterId}/${lesson.lessonId}${needsSuffix ? ` (part ${item.index})` : ''}`,
          );
        } else {
          const materialsDir = path.join(
            lessonDir,
            `${lessonPart}${partSuffix}_materials`,
          );
          params.logger.info(`Downloading materials (${pages.length} reference page(s)) to: ${materialsDir}`);
          await downloadLessonMaterials({ referencePageUrls: pages, outDir: materialsDir, headers, logger: params.logger });
        }
      }

      if (params.transcribe) {
        const transcriptPath = outFilePath.replace(/\.ts$/i, `_transcription.${params.transcribeFormat}`);
        const transcriptExists = await fs
          .stat(transcriptPath)
          .then((s) => s.isFile() && s.size > 0)
          .catch(() => false);

        let shouldTranscribe = true;

        if (transcriptExists) {
          if (params.transcribeFormat === 'txt') {
            const text = (await readTextFileIfExists(transcriptPath)) ?? '';
            const normalized = text.trim();
            if (normalized && normalized !== '[BLANK_AUDIO]') {
              params.logger.info(`Transcription exists; skipping: ${path.relative(process.cwd(), transcriptPath)}`);
              shouldTranscribe = false;
            } else {
              params.logger.warn(`Transcription exists but looks empty; retranscribing: ${path.relative(process.cwd(), transcriptPath)}`);
            }
          } else {
            params.logger.info(`Transcription exists; skipping: ${path.relative(process.cwd(), transcriptPath)}`);
            shouldTranscribe = false;
          }
        }

        if (shouldTranscribe) {
          params.logger.info(`Transcribing: ${outFilePath}`);
          const transcribeParams: {
            inputPath: string;
            model: string;
            format: 'txt' | 'srt' | 'vtt';
            logger: Logger;
            language?: string;
            noSpeechThreshold?: number;
            maxSeconds?: number;
          } = {
            inputPath: outFilePath,
            model: params.transcribeModel,
            format: params.transcribeFormat,
            logger: params.logger,
          };

          if (typeof params.transcribeLanguage === 'string' && params.transcribeLanguage.trim()) {
            transcribeParams.language = params.transcribeLanguage;
          }
          if (typeof params.noSpeechThreshold === 'number' && Number.isFinite(params.noSpeechThreshold)) {
            transcribeParams.noSpeechThreshold = params.noSpeechThreshold;
          }
          if (typeof params.maxSeconds === 'number' && Number.isFinite(params.maxSeconds)) {
            transcribeParams.maxSeconds = params.maxSeconds;
          }

          await transcribeCommand(transcribeParams);
        }

        if (params.transcribeFormat === 'txt') {
          const byLesson = chapterMarkdown.get(lesson.chapterId) ?? new Map<number, ChapterMarkdownLesson>();
          if (!chapterMarkdown.has(lesson.chapterId)) chapterMarkdown.set(lesson.chapterId, byLesson);

          let entry = byLesson.get(lessonIndex);
          if (!entry) {
            entry = {
              lessonIndex,
              lessonId: lesson.lessonId,
              transcriptPaths: [],
            };
            if (lesson.lessonTitle) entry.lessonTitle = lesson.lessonTitle;
            byLesson.set(lessonIndex, entry);
          }
          entry.transcriptPaths.push(transcriptPath);
        }
      }

      downloaded.push({ lesson, outFilePath });
    }
  }

  if (params.transcribe) {
    if (params.transcribeFormat !== 'txt') {
      params.logger.warn('Skipping chapter aggregated markdown: only supported for --transcribe-format txt');
    } else {
      for (const [chapterId, lessonsByIndex] of chapterMarkdown) {
        const chapterDirName = chapterDirNameForId(chapterId);
        const chapterPart = `chapter-${chapterId}`;
        const chapterDir = path.join(courseDir, chapterDirName);
        const outMdPath = path.join(chapterDir, `${chapterPart}_transcription.md`);

        const lessonIndexes = [...lessonsByIndex.keys()].sort((a, b) => a - b);
        const sections: string[] = [];

        for (const lessonIndex of lessonIndexes) {
          const entry = lessonsByIndex.get(lessonIndex);
          if (!entry) continue;

          const title = (entry.lessonTitle ?? `lesson-${entry.lessonId}`).replaceAll(/\s+/g, ' ').trim();
          const transcriptTexts: string[] = [];
          for (const p of entry.transcriptPaths) {
            const text = (await readTextFileIfExists(p)) ?? '';
            const normalized = text.trim();
            if (normalized) transcriptTexts.push(normalized);
          }

          const body = transcriptTexts.join('\n\n');
          sections.push(`## ${pad2(entry.lessonIndex)} ${title}\n\n${body}`.trimEnd());
        }

        const md = sections.join('\n\n');
        await fs.writeFile(outMdPath, md + (md.endsWith('\n') ? '' : '\n'), 'utf8');
        params.logger.info(`Wrote chapter transcription markdown: ${path.relative(process.cwd(), outMdPath)}`);
      }
    }
  }

  params.logger.info('All downloads finished.');
  return { downloaded };
}
