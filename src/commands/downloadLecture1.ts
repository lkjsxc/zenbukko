import path from 'node:path';
import fs from 'node:fs/promises';
import type { Logger } from '../utils/log.js';
import { buildCookieHeader, SessionStore } from '../session/sessionStore.js';
import { safeBasename } from '../utils/fs.js';
import { NnnClient } from '../services/nnnClient.js';
import { downloadHlsToFile } from '../downloader/hls.js';
import { downloadLessonMaterials } from '../services/materials.js';
import { preflightTranscription, transcribeCommand } from './transcribe.js';

export async function downloadLecture1Command(params: {
  sessionPath: string;
  outputDir: string;
  headless: boolean;
  courseId: number;
  transcribe: boolean;
  transcribeLanguage?: string;
  noSpeechThreshold?: number;
  materials: boolean;
  logger: Logger;
}): Promise<void> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) {
    throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);
  }

  const client = new NnnClient(session);
  const lecture = await client.resolveFirstLecture(params.courseId);

  // Use stable, ID-based folder names to avoid changes when titles differ.
  // (Keeps existing chapter/lesson ID naming scheme consistent.)
  const coursePart = safeBasename(`course-${lecture.courseId}`);

  // Backward-compat: earlier versions used courseTitle as the folder.
  // If we find an existing title-based folder, rename it to the ID-based folder
  // to avoid re-downloading large media.
  const legacyCoursePart = safeBasename(lecture.courseTitle ?? `course-${lecture.courseId}`);
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
  const chapterPart = `chapter-${lecture.chapterId}`;
  const lessonPart = `lesson-${lecture.lessonId}`;

  const outFilePath = path.join(
    params.outputDir,
    coursePart,
    chapterPart,
    `${lessonPart}.ts`,
  );

  const materialsDir = path.join(
    params.outputDir,
    coursePart,
    chapterPart,
    `${lessonPart}_materials`,
  );

  params.logger.info(`Resolved HLS URL: ${lecture.videoUrl}`);
  params.logger.info(`Downloading to: ${outFilePath}`);

  if (params.transcribe) {
    await preflightTranscription({ model: 'base', requireFfmpeg: true });
  }

  const headers: Record<string, string> = {
    'user-agent': session.userAgent ?? 'zenbukko/2.0',
    referer: 'https://www.nnn.ed.nico/',
  };

  const cookieForWww = buildCookieHeader(session, new URL('https://www.nnn.ed.nico/'));
  if (cookieForWww) headers.cookie = cookieForWww;

  const mediaExists = await fs
    .stat(outFilePath)
    .then((s) => s.isFile() && s.size > 0)
    .catch(() => false);

  if (mediaExists) {
    params.logger.info(`Media already exists, skipping download: ${outFilePath}`);
  } else {
    await downloadHlsToFile(new URL(lecture.videoUrl), {
      outFilePath,
      headers,
      onProgress: ({ segmentIndex, segmentCount }) => {
        if (segmentIndex === 1 || segmentIndex === segmentCount || segmentIndex % 50 === 0) {
          params.logger.info(`HLS segments: ${segmentIndex}/${segmentCount}`);
        }
      },
    });

    params.logger.info('Download finished.');
  }

  if (params.materials) {
    const pages = lecture.referencePageUrls ?? [];
    if (pages.length === 0) {
      params.logger.warn('No lesson reference URLs found; skipping materials download.');
    } else {
      params.logger.info(`Downloading materials (${pages.length} reference page(s)) to: ${materialsDir}`);
      const result = await downloadLessonMaterials({
        referencePageUrls: pages,
        outDir: materialsDir,
        headers,
        logger: params.logger,
      });
      if (result.downloaded.length > 0) {
        params.logger.info(`Materials downloaded: ${result.downloaded.length} file(s).`);
      }
    }
  }

  if (params.transcribe) {
    const transcriptPath = outFilePath.replace(/\.ts$/i, '_transcription.txt');
    const transcriptExists = await fs
      .stat(transcriptPath)
      .then((s) => s.isFile() && s.size > 0)
      .catch(() => false);

    if (transcriptExists) {
      const content = await fs.readFile(transcriptPath, 'utf8').catch(() => '');
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const hasRealText = lines.some((l) => l !== '[BLANK_AUDIO]');
      if (hasRealText) {
        params.logger.info(`Transcript already exists, skipping: ${transcriptPath}`);
        return;
      }

      params.logger.warn(`Transcript exists but appears empty; re-transcribing: ${transcriptPath}`);
    }

    params.logger.info(`Transcribing: ${outFilePath}`);
    await transcribeCommand({
      inputPath: outFilePath,
      model: 'base',
      language: params.transcribeLanguage ?? 'ja',
      ...(typeof params.noSpeechThreshold === 'number' && Number.isFinite(params.noSpeechThreshold)
        ? { noSpeechThreshold: params.noSpeechThreshold }
        : {}),
      format: 'txt',
      logger: params.logger,
    });
  }
}
