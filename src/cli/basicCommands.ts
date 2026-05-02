import type { Command } from 'commander';
import { authCommand } from '../commands/auth.js';
import { listCoursesCommand } from '../commands/listCourses.js';
import { setupWhisperCommand } from '../commands/setupWhisper.js';
import { transcribeCommand } from '../commands/transcribe.js';
import { ocrMaterialsCommand } from '../services/geminiOcr.js';
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
    .description('Run Gemini PDF OCR for downloaded lesson materials')
    .requiredOption('--input <path>', 'Downloads, course, lesson, or materials directory to scan for PDFs')
    .option('--model <name>', 'Gemini model name', 'gemini-3-flash-preview')
    .option('--force', 'Re-run OCR even when markdown output already exists', false)
    .option('--ocr-mode <mode>', 'auto|batch|flex', 'auto')
    .option('--ocr-service-tier <tier>', 'flex|standard', 'flex')
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await ocrMaterialsCommand({
        inputDir: String(cmd.input),
        ...(ctx.cfg.geminiApiKey ? { apiKey: ctx.cfg.geminiApiKey } : {}),
        model: String(cmd.model ?? ctx.cfg.geminiModel),
        force: Boolean(cmd.force),
        mode: modeFrom(cmd.ocrMode, ctx.cfg.ocrMode),
        serviceTier: tierFrom(cmd.ocrServiceTier, ctx.cfg.ocrServiceTier),
        retries: ctx.cfg.ocrRetries,
        timeoutMs: ctx.cfg.ocrTimeoutMs,
        logger: ctx.logger,
      });
    });

  program.command('web').description('Start the local Docker-friendly web UI').option('--host <host>', 'Bind host', '0.0.0.0').option('--port <port>', 'Bind port', (v) => Number(v)).action(async (cmd) => {
    const ctx = makeContext(program);
    await startWebServer({
      host: String(cmd.host ?? '0.0.0.0'),
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
      await setupWhisperCommand({ logger: ctx.logger, model: String(cmd.model ?? 'base'), backend: backendFrom(cmd.backend), force: Boolean(cmd.force) });
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

function backendFrom(value: unknown): 'auto' | 'cpu' | 'cuda' | 'both' {
  return value === 'cpu' || value === 'cuda' || value === 'both' ? value : 'auto';
}
