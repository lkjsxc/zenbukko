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

  params.logger.info(`Resolved ${lessons.length} lesson(s) across ${structure.chapters.length} chapter(s).`);

  const headers: Record<string, string> = {
    'user-agent': session.userAgent ?? 'zenbukko/2.0',
    referer: 'https://www.nnn.ed.nico/',
  };

  const cookieForWww = buildCookieHeader(session, new URL('https://www.nnn.ed.nico/'));
  if (cookieForWww) headers.cookie = cookieForWww;

  const downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> = [];

  const chapterLessonIndex = new Map<number, number>();

  for (const lesson of lessons) {
    const chapterPart = `chapter-${lesson.chapterId}`;
    const lessonPart = `lesson-${lesson.lessonId}`;

    const chapterDir = path.join(params.outputDir, coursePart, chapterPart);
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
        const chapterPart = `chapter-${chapterId}`;
        const chapterDir = path.join(params.outputDir, coursePart, chapterPart);
        const outMdPath = path.join(chapterDir, `${chapterPart}_transcription.md`);

        const lessonIndexes = [...lessonsByIndex.keys()].sort((a, b) => a - b);
        const sections: string[] = [];

        for (const lessonIndex of lessonIndexes) {
          const entry = lessonsByIndex.get(lessonIndex);
          if (!entry) continue;

          const title = (entry.lessonTitle ?? `lesson-${entry.lessonId}`).replaceAll(/\s+/g, ' ').trim();
          const transcriptTexts: string[] = [];
          for (const p of entry.transcriptPaths) {
            // eslint-disable-next-line no-await-in-loop
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
