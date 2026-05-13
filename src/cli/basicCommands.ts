import type { Command } from 'commander';
import { authCommand } from '../commands/auth.js';
import { listCoursesCommand } from '../commands/listCourses.js';
import { setupWhisperCommand } from '../commands/setupWhisper.js';
import { transcribeCommand } from '../commands/transcribe.js';
import { DEFAULT_GEMINI_MODEL } from '../geminiDefaults.js';
import { ocrMaterialsCommand } from '../services/geminiOcr.js';
import { rebuildChapterOcr } from '../services/chapterOcr.js';
import { startWebServer } from '../web/server.js';
import { headlessFrom, makeContext } from './context.js';

export function registerBasicCommands(program: Command): void {
  program.command('auth').description('Authenticate using a real browser login and save session cookies').action(async () => {
    const ctx = makeContext(program);
    await authCommand({ sessionPath: ctx.sessionPath, headless: headlessFrom(ctx), logger: ctx.logger });
  });

  program.command('list-courses').description('List available courses for the authenticated user').option('--format <format>', 'table|json', 'table').action(async (cmd) => {
    const ctx = makeContext(program);
    await listCoursesCommand({ sessionPath: ctx.sessionPath, headless: headlessFrom(ctx), format: String(cmd.format ?? 'table') as 'table' | 'json', logger: ctx.logger });
  });

  program.command('ocr-materials')
    .description('Run PDF OCR for downloaded lesson materials')
    .requiredOption('--input <path>', 'Downloads, course, lesson, or materials directory to scan for PDFs')
    .option('--ocr-backend <backend>', 'auto|local|gemini')
    .option('--model <name>', 'Gemini model name', DEFAULT_GEMINI_MODEL)
    .option('--force', 'Re-run OCR even when markdown output already exists', false)
    .option('--ocr-mode <mode>', 'auto|batch|flex')
    .option('--ocr-service-tier <tier>', 'flex|standard')
    .option('--ndlocr-command <path>', 'NDLOCR-Lite executable')
    .option('--ndlocr-device <device>', 'cpu|cuda')
    .option('--ocr-page-dpi <n>', 'PDF rasterization DPI for local OCR', (v) => Number(v))
    .option('--ocr-keep-intermediates', 'Keep local OCR page images and raw output', false)
    .option('--ndlocr-enable-tcy', 'Enable NDLOCR-Lite tate-chu-yoko handling')
    .option('--no-ndlocr-enable-tcy', 'Disable NDLOCR-Lite tate-chu-yoko handling')
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await ocrMaterialsCommand({
        inputDir: String(cmd.input),
        backend: backendFrom(cmd.ocrBackend, ctx.cfg.ocrBackend),
        ...(ctx.cfg.geminiApiKey ? { apiKey: ctx.cfg.geminiApiKey } : {}),
        model: String(cmd.model ?? ctx.cfg.geminiModel),
        force: Boolean(cmd.force),
        mode: modeFrom(cmd.ocrMode, ctx.cfg.ocrMode),
        serviceTier: tierFrom(cmd.ocrServiceTier, ctx.cfg.ocrServiceTier),
        retries: ctx.cfg.ocrRetries,
        timeoutMs: ctx.cfg.ocrTimeoutMs,
        ndlocrCommand: stringOption(cmd.ndlocrCommand, ctx.cfg.ndlocrCommand),
        ndlocrDevice: deviceFrom(cmd.ndlocrDevice, ctx.cfg.ndlocrDevice),
        ocrPageDpi: numberOption(cmd.ocrPageDpi, ctx.cfg.ocrPageDpi),
        ocrKeepIntermediates: Boolean(cmd.ocrKeepIntermediates) || ctx.cfg.ocrKeepIntermediates,
        ndlocrEnableTcy: booleanOption(cmd.ndlocrEnableTcy, ctx.cfg.ndlocrEnableTcy),
        logger: ctx.logger,
      });
    });

  program.command('rebuild-chapter-ocr')
    .description('Rebuild chapter OCR Markdown from existing materials_ocr.md files')
    .requiredOption('--input <path>', 'Downloads, course, chapter, lesson, or materials directory to scan')
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await rebuildChapterOcr({ inputDir: String(cmd.input), logger: ctx.logger });
    });

  program.command('web').description('Start the local Docker-friendly web UI').option('--host <host>', 'Bind host', '127.0.0.1').option('--port <port>', 'Bind port', (v) => Number(v)).action(async (cmd) => {
    const ctx = makeContext(program);
    await startWebServer({
      host: String(cmd.host ?? '127.0.0.1'),
      port: typeof cmd.port === 'number' && Number.isFinite(cmd.port) ? (cmd.port as number) : ctx.cfg.webPort,
      config: ctx.cfg,
      logger: ctx.logger,
    });
  });

  program.command('setup-whisper')
    .description('Clone and build whisper.cpp, and download a model')
    .option('--model <name>', 'Whisper model name', 'large-v3-turbo')
    .option('--backend <backend>', 'auto|cpu|cuda|both', 'auto')
    .option('--force', 'Reinstall whisper.cpp even if it already exists', false)
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await setupWhisperCommand({ logger: ctx.logger, model: String(cmd.model ?? 'base'), backend: whisperBackendFrom(cmd.backend), force: Boolean(cmd.force) });
    });

  program.command('transcribe')
    .description('Transcribe a media file using whisper.cpp')
    .requiredOption('--input <path>', 'Input media file path')
    .option('--model <name>', 'Whisper model name', 'large-v3-turbo')
    .option('--language <code>', 'Language code (optional)')
    .option('--no-speech-thold <n>', 'whisper.cpp no-speech threshold', (v) => Number(v))
    .option('--format <fmt>', 'txt|srt|vtt', 'txt')
    .option('--max-seconds <n>', 'Only transcribe the first N seconds', (v) => Number(v))
    .action(async (cmd) => {
      const ctx = makeContext(program);
      const args: Parameters<typeof transcribeCommand>[0] = { inputPath: String(cmd.input), model: String(cmd.model ?? 'base'), format: String(cmd.format ?? 'txt') as 'txt' | 'srt' | 'vtt', logger: ctx.logger };
      if (cmd.language) args.language = String(cmd.language);
      if (typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold)) args.noSpeechThreshold = cmd.noSpeechThold as number;
      if (typeof cmd.maxSeconds === 'number' && Number.isFinite(cmd.maxSeconds)) args.maxSeconds = cmd.maxSeconds as number;
      await transcribeCommand(args);
    });
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

function stringOption(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function whisperBackendFrom(value: unknown): 'auto' | 'cpu' | 'cuda' | 'both' {
  return value === 'cpu' || value === 'cuda' || value === 'both' ? value : 'auto';
}
