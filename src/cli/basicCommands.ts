import type { Command } from 'commander';
import { authCommand } from '../commands/auth.js';
import { doctorCommand } from '../commands/doctor.js';
import { listCoursesCommand } from '../commands/listCourses.js';
import { setupWhisperCommand } from '../commands/setupWhisper.js';
import { transcribeCommand } from '../commands/transcribe.js';
import { ocrMaterialsCommand } from '../services/ocr/index.js';
import { buildReportPrompt, type BuildReportPromptParams } from '../services/reportPrompt.js';
import { rebuildChapterOcr } from '../services/chapterOcr.js';
import { headlessFrom, makeContext } from './context.js';
import { addLocalOcrOptions, localOcrOptionsFrom } from './ocrOptions.js';

export function registerBasicCommands(program: Command): void {
  program.command('doctor')
    .description('Check native dependencies and local paths without starting work')
    .option('--model <name>', 'Whisper model name to check', 'large-v3-turbo')
    .option('--json', 'Print machine-readable JSON', false)
    .action(async (cmd) => {
      const ctx = makeContext(program);
      const report = await doctorCommand({
        config: ctx.cfg,
        model: String(cmd.model ?? 'large-v3-turbo'),
        json: Boolean(cmd.json),
      });
      if (!report.ok) process.exitCode = 1;
    });

  program.command('auth').description('Authenticate using a real browser login and save session cookies').action(async () => {
    const ctx = makeContext(program);
    await authCommand({ sessionPath: ctx.sessionPath, headless: headlessFrom(ctx), logger: ctx.logger });
  });

  program.command('list-courses').description('List available courses for the authenticated user').option('--format <format>', 'table|json', 'table').action(async (cmd) => {
    const ctx = makeContext(program);
    await listCoursesCommand({ sessionPath: ctx.sessionPath, headless: headlessFrom(ctx), format: String(cmd.format ?? 'table') as 'table' | 'json', logger: ctx.logger });
  });

  addLocalOcrOptions(program.command('ocr-materials')
    .description('Run local PDF OCR for downloaded lesson materials')
    .requiredOption('--input <path>', 'Downloads, course, lesson, or materials directory to scan for PDFs')
    .option('--force', 'Re-run OCR even when markdown output already exists', false))
    .action(async (cmd) => {
      const ctx = makeContext(program);
      await ocrMaterialsCommand({
        inputDir: String(cmd.input),
        force: Boolean(cmd.force),
        ...localOcrOptionsFrom(cmd, ctx.cfg),
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

  program.command('build-report-prompt')
    .description('Build a report prompt from existing OCR and transcript artifacts')
    .requiredOption('--input <path>', 'Downloads, course, chapter, lesson, or materials directory to scan')
    .option('--output <path>', 'Output prompt path')
    .option('--course-name <name>', 'Course name to embed in the prompt')
    .option('--topic <text>', 'Report topic from the submission page')
    .action(async (cmd) => {
      const ctx = makeContext(program);
      const request: BuildReportPromptParams = { inputDir: String(cmd.input) };
      const outputPath = optionalString(cmd.output);
      const courseName = optionalString(cmd.courseName);
      const topic = optionalString(cmd.topic);
      if (outputPath) request.outputPath = outputPath;
      if (courseName) request.courseName = courseName;
      if (topic) request.topic = topic;
      const result = await buildReportPrompt(request);
      ctx.logger.info(`Wrote report prompt: ${result.outputPath}`);
      ctx.logger.info(`Included ${result.sources.length} source artifact(s).`);
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

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function whisperBackendFrom(value: unknown): 'auto' | 'cpu' | 'cuda' | 'both' {
  return value === 'cpu' || value === 'cuda' || value === 'both' ? value : 'auto';
}
