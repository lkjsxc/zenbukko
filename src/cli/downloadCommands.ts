import type { Command } from 'commander';
import { downloadCommand } from '../commands/download.js';
import { downloadAllCommand } from '../commands/downloadAll.js';
import { addRepeatedNumber, headlessFrom, makeContext } from './context.js';
import { addLocalOcrOptions, localOcrOptionsFrom } from './ocrOptions.js';

export function registerDownloadCommands(program: Command): void {
  addDownloadOptions(program.command('download').description('Download lessons for a course (HLS -> .ts)').requiredOption('--course-id <id>', 'Course ID', (v) => Number(v)))
    .option('--chapter <id>', 'Chapter ID to include (repeatable)', addRepeatedNumber, [])
    .option('--lesson-id <id>', 'Lesson ID to include (repeatable)', addRepeatedNumber, [])
    .option('--first-lecture-only', 'Only download the first resolved lesson', false)
    .action(async (cmd) => {
      const ctx = makeContext(program);
      const lessonIds = arrayOption(cmd.lessonId);
      const chapters = arrayOption(cmd.chapter);
      await downloadCommand({
        ...downloadCommon(ctx, cmd),
        courseId: cmd.courseId as number,
        firstLectureOnly: Boolean(cmd.firstLectureOnly) && !(lessonIds && lessonIds.length > 0),
        ...(chapters ? { chapters } : {}),
        ...(lessonIds ? { lessonIds } : {}),
      });
    });

  addDownloadOptions(program.command('download-all').description('Download all on-demand courses (HLS -> .ts). Optionally download materials and transcribe.'))
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await downloadAllCommand({ ...downloadCommon(ctx, cmd), headless: headlessFrom(ctx) });
    });
}

function addDownloadOptions(command: Command): Command {
  return addLocalOcrOptions(command
    .option('--chapter-range <range>', 'One-based chapter order range, e.g. 1,3-5')
    .option('--max-concurrency <n>', 'Max API concurrency when resolving lesson URLs', (v) => Number(v), 6)
    .option('--transcribe', 'Transcribe after each download', false)
    .option('--transcribe-model <name>', 'Whisper model name', 'large-v3-turbo')
    .option('--transcribe-format <fmt>', 'txt|srt|vtt', 'txt')
    .option('--transcribe-language <code>', 'Language code to force during transcription', 'ja')
    .option('--no-speech-thold <n>', 'whisper.cpp no-speech threshold', (v) => Number(v))
    .option('--max-seconds <n>', 'Only transcribe the first N seconds', (v) => Number(v))
    .option('--materials', 'Download lesson materials', false)
    .option('--delete-media-after-transcribe', 'Delete media after usable transcript exists', false)
    .option('--ocr-materials', 'Run local PDF OCR for downloaded lesson materials', false)
    .option('--ocr-force', 'Re-run local PDF OCR even when markdown output already exists', false));
}

function downloadCommon(ctx: ReturnType<typeof makeContext>, cmd: Record<string, unknown>) {
  const args = {
    sessionPath: ctx.sessionPath,
    outputDir: ctx.outputDir,
    maxConcurrency: Number(cmd.maxConcurrency ?? 6),
    transcribe: Boolean(cmd.transcribe),
    transcribeModel: String(cmd.transcribeModel ?? 'base'),
    transcribeFormat: String(cmd.transcribeFormat ?? 'txt') as 'txt' | 'srt' | 'vtt',
    materials: Boolean(cmd.materials) || Boolean(cmd.ocrMaterials),
    deleteMediaAfterTranscribe: Boolean(cmd.deleteMediaAfterTranscribe),
    ocrMaterials: Boolean(cmd.ocrMaterials),
    ocrForce: Boolean(cmd.ocrForce),
    ...localOcrOptionsFrom(cmd, ctx.cfg),
    logger: ctx.logger,
  };
  return {
    ...args,
    ...(typeof cmd.chapterRange === 'string' && cmd.chapterRange.trim() ? { chapterRange: cmd.chapterRange.trim() } : {}),
    ...(typeof cmd.transcribeLanguage === 'string' && cmd.transcribeLanguage.trim() ? { transcribeLanguage: String(cmd.transcribeLanguage) } : {}),
    ...(typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold) ? { noSpeechThreshold: cmd.noSpeechThold as number } : {}),
    ...(typeof cmd.maxSeconds === 'number' && Number.isFinite(cmd.maxSeconds) ? { maxSeconds: cmd.maxSeconds as number } : {}),
  };
}

function arrayOption(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.length > 0 ? (value as number[]) : undefined;
}

