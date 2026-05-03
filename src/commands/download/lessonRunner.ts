import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../../utils/log.js';
import { readTextFileIfExists } from '../../utils/fs.js';
import { downloadHlsToFile } from '../../downloader/hls.js';
import { downloadLessonMaterials } from '../../services/materials.js';
import { ocrMaterialsCommand } from '../../services/geminiOcr.js';
import { rebuildChapterOcr } from '../../services/chapterOcr.js';
import { deleteMediaArtifactsAfterTranscript } from '../../services/mediaCleanup.js';
import { transcribeCommand } from '../transcribe.js';
import type { CourseLesson } from '../../services/nnnClient.js';
import type { DownloadCommandParams } from './types.js';
import { migrateLegacyChapterDir } from './legacyDirs.js';
import type { ChapterMarkdown } from './chapterMarkdown.js';

export async function downloadResolvedLessons(ctx: {
  params: DownloadCommandParams;
  lessons: CourseLesson[];
  courseDir: string;
  headers: Record<string, string>;
  chapterDirNameForId: (chapterId: number) => string;
  chapterMarkdown: ChapterMarkdown;
}): Promise<Array<{ lesson: CourseLesson; outFilePath: string }>> {
  const downloaded: Array<{ lesson: CourseLesson; outFilePath: string }> = [];
  const workItems: WorkItem[] = [];
  const chapterLessonIndex = new Map<number, number>();
  const migratedChapters = new Set<number>();

  for (const lesson of ctx.lessons) {
    const chapterDirName = ctx.chapterDirNameForId(lesson.chapterId);
    if (!migratedChapters.has(lesson.chapterId)) {
      migratedChapters.add(lesson.chapterId);
      await migrateLegacyChapterDir({ courseDir: ctx.courseDir, chapterId: lesson.chapterId, chapterDirName, logger: ctx.params.logger });
    }

    const lessonIndex = (chapterLessonIndex.get(lesson.chapterId) ?? 0) + 1;
    chapterLessonIndex.set(lesson.chapterId, lessonIndex);
    const lessonDir = path.join(ctx.courseDir, chapterDirName, String(lessonIndex).padStart(2, '0'));
    await fs.mkdir(lessonDir, { recursive: true });

    for (const item of lessonItems(lesson)) {
      const outFilePath = path.join(lessonDir, `lesson-${lesson.lessonId}${item.suffix}.ts`);
      workItems.push({ ...ctx, lesson, item, lessonIndex, outFilePath });
    }
  }

  const materialsDirs = ctx.params.materials ? await downloadAllMaterials(workItems) : [];
  for (const item of workItems) {
    await processMediaItem(item);
    downloaded.push({ lesson: item.lesson, outFilePath: item.outFilePath });
  }
  if (ctx.params.ocrMaterials) {
    await ocrAllMaterials(ctx.params, materialsDirs);
    await rebuildChapterOcr({ inputDir: ctx.courseDir, logger: ctx.params.logger });
  }
  return downloaded;
}

type LessonItem = {
  index: number;
  suffix: string;
  videoUrl: string;
  referencePageUrls?: string[];
};

type WorkItem = {
  params: DownloadCommandParams;
  headers: Record<string, string>;
  chapterMarkdown: ChapterMarkdown;
  lesson: CourseLesson;
  item: LessonItem;
  lessonIndex: number;
  outFilePath: string;
};

function lessonItems(lesson: CourseLesson): LessonItem[] {
  const items = lesson.videoItems && lesson.videoItems.length > 0 ? lesson.videoItems : [{ index: 1, videoUrl: lesson.videoUrl, referencePageUrls: lesson.referencePageUrls }];
  const needsSuffix = items.length > 1;
  return items.map((item) => ({
    index: item.index,
    suffix: needsSuffix ? `_part-${item.index}` : '',
    videoUrl: item.videoUrl,
    ...(item.referencePageUrls ? { referencePageUrls: item.referencePageUrls } : {}),
  }));
}

async function processMediaItem(ctx: WorkItem): Promise<void> {
  const needsSuffix = ctx.item.suffix !== '';
  ctx.params.logger.info(`Downloading: ${ctx.lesson.chapterId}/${ctx.lesson.lessonId}${needsSuffix ? ` (part ${ctx.item.index})` : ''} -> ${ctx.outFilePath}`);
  await downloadMedia(ctx.outFilePath, ctx.item.videoUrl, ctx.headers, ctx.params.logger);
  if (ctx.params.transcribe) await handleTranscription(ctx);
}

async function downloadMedia(outFilePath: string, videoUrl: string, headers: Record<string, string>, logger: Logger): Promise<void> {
  const exists = await fs.stat(outFilePath).then((s) => s.isFile() && s.size > 0).catch(() => false);
  if (exists) {
    logger.info(`Media already exists, skipping download: ${outFilePath}`);
    return;
  }
  await downloadHlsToFile(new URL(videoUrl), {
    outFilePath,
    headers,
    onProgress: ({ segmentIndex, segmentCount }) => {
      if (segmentIndex === 1 || segmentIndex === segmentCount || segmentIndex % 100 === 0) logger.info(`HLS segments: ${segmentIndex}/${segmentCount}`);
    },
  });
}

async function downloadAllMaterials(items: WorkItem[]): Promise<string[]> {
  const dirs: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const dir = await handleMaterials(item);
    if (dir && !seen.has(dir)) {
      seen.add(dir);
      dirs.push(dir);
    }
  }
  return dirs;
}

async function handleMaterials(ctx: WorkItem): Promise<string | undefined> {
  const needsSuffix = ctx.item.suffix !== '';
  const pages = ctx.item.referencePageUrls ?? [];
  if (pages.length === 0) {
    ctx.params.logger.warn(`No lesson reference URLs found; skipping materials: ${ctx.lesson.chapterId}/${ctx.lesson.lessonId}${needsSuffix ? ` (part ${ctx.item.index})` : ''}`);
    return undefined;
  }
  const materialsDir = path.join(path.dirname(ctx.outFilePath), `lesson-${ctx.lesson.lessonId}${ctx.item.suffix}_materials`);
  ctx.params.logger.info(`Downloading materials (${pages.length} reference page(s)) to: ${materialsDir}`);
  await downloadLessonMaterials({ referencePageUrls: pages, outDir: materialsDir, headers: ctx.headers, logger: ctx.params.logger });
  return materialsDir;
}

async function ocrAllMaterials(params: DownloadCommandParams, materialsDirs: string[]): Promise<void> {
  for (const materialsDir of materialsDirs) {
    await ocrMaterialsCommand({
      inputDir: materialsDir,
      ...(params.geminiApiKey ? { apiKey: params.geminiApiKey } : {}),
      model: params.ocrModel,
      force: params.ocrForce,
      ...(params.ocrMode ? { mode: params.ocrMode } : {}),
      ...(params.ocrServiceTier ? { serviceTier: params.ocrServiceTier } : {}),
      ...(typeof params.ocrRetries === 'number' ? { retries: params.ocrRetries } : {}),
      ...(typeof params.ocrTimeoutMs === 'number' ? { timeoutMs: params.ocrTimeoutMs } : {}),
      logger: params.logger,
    });
  }
}

async function handleTranscription(ctx: WorkItem): Promise<void> {
  const transcriptPath = ctx.outFilePath.replace(/\.ts$/i, `_transcription.${ctx.params.transcribeFormat}`);
  if (await shouldTranscribe(transcriptPath, ctx.params.transcribeFormat, ctx.params.logger)) {
    await transcribeCommand(transcribeParams(ctx));
  }
  if (ctx.params.deleteMediaAfterTranscribe) await deleteMediaArtifactsAfterTranscript({ mediaPath: ctx.outFilePath, transcriptPath, logger: ctx.params.logger });
  if (ctx.params.transcribeFormat === 'txt') {
    ctx.chapterMarkdown.addTranscript({
      chapterId: ctx.lesson.chapterId,
      lessonIndex: ctx.lessonIndex,
      lessonId: ctx.lesson.lessonId,
      ...(ctx.lesson.lessonTitle ? { lessonTitle: ctx.lesson.lessonTitle } : {}),
      transcriptPath,
    });
  }
}

async function shouldTranscribe(pathname: string, format: 'txt' | 'srt' | 'vtt', logger: Logger): Promise<boolean> {
  const exists = await fs.stat(pathname).then((s) => s.isFile() && s.size > 0).catch(() => false);
  if (!exists) return true;
  if (format !== 'txt') {
    logger.info(`Transcription exists; skipping: ${path.relative(process.cwd(), pathname)}`);
    return false;
  }
  const normalized = ((await readTextFileIfExists(pathname)) ?? '').trim();
  if (normalized && normalized !== '[BLANK_AUDIO]') {
    logger.info(`Transcription exists; skipping: ${path.relative(process.cwd(), pathname)}`);
    return false;
  }
  logger.warn(`Transcription exists but looks empty; retranscribing: ${path.relative(process.cwd(), pathname)}`);
  return true;
}

function transcribeParams(ctx: WorkItem) {
  const p: Parameters<typeof transcribeCommand>[0] = {
    inputPath: ctx.outFilePath,
    model: ctx.params.transcribeModel,
    format: ctx.params.transcribeFormat,
    logger: ctx.params.logger,
  };
  if (typeof ctx.params.transcribeLanguage === 'string' && ctx.params.transcribeLanguage.trim()) p.language = ctx.params.transcribeLanguage;
  if (typeof ctx.params.noSpeechThreshold === 'number' && Number.isFinite(ctx.params.noSpeechThreshold)) p.noSpeechThreshold = ctx.params.noSpeechThreshold;
  if (typeof ctx.params.maxSeconds === 'number' && Number.isFinite(ctx.params.maxSeconds)) p.maxSeconds = ctx.params.maxSeconds;
  return p;
}
