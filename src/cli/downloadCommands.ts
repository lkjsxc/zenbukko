import type { Command } from 'commander';
import { downloadCommand } from '../commands/download.js';
import { downloadAllCommand } from '../commands/downloadAll.js';
import { DEFAULT_GEMINI_MODEL } from '../geminiDefaults.js';
import { addRepeatedNumber, headlessFrom, makeContext } from './context.js';

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
  return command
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
    .option('--ocr-materials', 'Run PDF OCR for downloaded lesson materials', false)
    .option('--ocr-backend <backend>', 'auto|local|gemini')
    .option('--ocr-model <name>', 'Gemini model name for PDF OCR', DEFAULT_GEMINI_MODEL)
    .option('--ocr-force', 'Re-run Gemini PDF OCR even when markdown output already exists', false)
    .option('--ocr-mode <mode>', 'auto|batch|flex')
    .option('--ocr-service-tier <tier>', 'flex|standard')
    .option('--ndlocr-command <path>', 'NDLOCR-Lite executable')
    .option('--ndlocr-device <device>', 'cpu|cuda')
    .option('--ocr-page-dpi <n>', 'PDF rasterization DPI for local OCR', (v) => Number(v))
    .option('--ocr-keep-intermediates', 'Keep local OCR page images and raw output', false)
    .option('--ndlocr-enable-tcy', 'Enable NDLOCR-Lite tate-chu-yoko handling')
    .option('--no-ndlocr-enable-tcy', 'Disable NDLOCR-Lite tate-chu-yoko handling');
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
    ocrBackend: backendFrom(cmd.ocrBackend, ctx.cfg.ocrBackend),
    ocrModel: String(cmd.ocrModel ?? ctx.cfg.geminiModel),
    ocrForce: Boolean(cmd.ocrForce),
    ocrMode: modeFrom(cmd.ocrMode, ctx.cfg.ocrMode),
    ocrServiceTier: tierFrom(cmd.ocrServiceTier, ctx.cfg.ocrServiceTier),
    ocrRetries: ctx.cfg.ocrRetries,
    ocrTimeoutMs: ctx.cfg.ocrTimeoutMs,
    ndlocrCommand: typeof cmd.ndlocrCommand === 'string' && cmd.ndlocrCommand.trim() ? cmd.ndlocrCommand.trim() : ctx.cfg.ndlocrCommand,
    ndlocrDevice: deviceFrom(cmd.ndlocrDevice, ctx.cfg.ndlocrDevice),
    ocrPageDpi: numberOption(cmd.ocrPageDpi, ctx.cfg.ocrPageDpi),
    ocrKeepIntermediates: Boolean(cmd.ocrKeepIntermediates) || ctx.cfg.ocrKeepIntermediates,
    ndlocrEnableTcy: booleanOption(cmd.ndlocrEnableTcy, ctx.cfg.ndlocrEnableTcy),
    logger: ctx.logger,
  };
  return {
    ...args,
    ...(ctx.cfg.geminiApiKey ? { geminiApiKey: ctx.cfg.geminiApiKey } : {}),
    ...(typeof cmd.chapterRange === 'string' && cmd.chapterRange.trim() ? { chapterRange: cmd.chapterRange.trim() } : {}),
    ...(typeof cmd.transcribeLanguage === 'string' && cmd.transcribeLanguage.trim() ? { transcribeLanguage: String(cmd.transcribeLanguage) } : {}),
    ...(typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold) ? { noSpeechThreshold: cmd.noSpeechThold as number } : {}),
    ...(typeof cmd.maxSeconds === 'number' && Number.isFinite(cmd.maxSeconds) ? { maxSeconds: cmd.maxSeconds as number } : {}),
  };
}

function arrayOption(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.length > 0 ? (value as number[]) : undefined;
}

function modeFrom(value: unknown, fallback: 'auto' | 'batch' | 'flex'): 'auto' | 'batch' | 'flex' {
  return value === 'auto' || value === 'batch' || value === 'flex' ? value : fallback;
}

function tierFrom(value: unknown, fallback: 'flex' | 'standard'): 'flex' | 'standard' {
  return value === 'flex' || value === 'standard' ? value : fallback;
}

function backendFrom(value: unknown, fallback: 'auto' | 'local' | 'gemini'): 'auto' | 'local' | 'gemini' {
  return value === 'auto' || value === 'local' || value === 'gemini' ? value : fallback;
}

function deviceFrom(value: unknown, fallback: 'cpu' | 'cuda'): 'cpu' | 'cuda' {
  return value === 'cpu' || value === 'cuda' ? value : fallback;
}

function numberOption(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
