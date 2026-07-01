import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../../utils/log.js';
import { readTextFileIfExists } from '../../utils/fs.js';
import { downloadHlsToFile } from '../../downloader/hls.js';
import { deleteMediaArtifactsAfterTranscript } from '../../services/mediaCleanup.js';
import { transcribeCommand } from '../transcribe.js';
import type { WorkItem } from './lessonItems.js';

export async function processMediaItem(ctx: WorkItem): Promise<void> {
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

async function handleTranscription(ctx: WorkItem): Promise<void> {
  const transcriptPath = ctx.outFilePath.replace(/\.ts$/i, `_transcription.${ctx.params.transcribeFormat}`);
  if (await shouldTranscribe(transcriptPath, ctx.params.transcribeFormat, ctx.params.logger)) await transcribeCommand(transcribeParams(ctx));
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
