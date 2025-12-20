#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { Logger } from './utils/log.js';
import { authCommand } from './commands/auth.js';
import { listCoursesCommand } from './commands/listCourses.js';
import { resolveLecture1Command } from './commands/resolveLecture1.js';
import { downloadLecture1Command } from './commands/downloadLecture1.js';
import { downloadCommand } from './commands/download.js';
import { setupWhisperCommand } from './commands/setupWhisper.js';
import { transcribeCommand } from './commands/transcribe.js';

const program = new Command();

program.name('zenbukko').description('Zenbukko (Node 22 + TypeScript rewrite)').version('2.0.0');

program
  .option('--session <path>', 'Session file path override')
  .option('--output <path>', 'Output directory override')
  .option('--headless', 'Run Puppeteer in headless mode')
  .option('--log-level <level>', 'silent|error|warn|info|debug');

program
  .command('auth')
  .description('Authenticate using a real browser login and save session cookies')
  .action(async () => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const headless = (opts.headless as boolean | undefined) ?? cfg.puppeteerHeadless;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);
    await authCommand({ sessionPath, headless, logger });
  });

program
  .command('list-courses')
  .description('List available courses for the authenticated user')
  .option('--format <format>', 'table|json', 'table')
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const headless = (opts.headless as boolean | undefined) ?? cfg.puppeteerHeadless;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const format = String(cmd.format ?? 'table') as 'table' | 'json';
    await listCoursesCommand({ sessionPath, headless, format, logger });
  });

program
  .command('resolve-lecture1')
  .description('Resolve Lecture 1 (first chapter + first lesson) to a download-ready HLS URL')
  .option('--course-id <id>', 'Course ID', (v) => Number(v))
  .option('--course-query <text>', 'Course title substring to search via browser')
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const headless = (opts.headless as boolean | undefined) ?? cfg.puppeteerHeadless;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const args: {
      sessionPath: string;
      headless: boolean;
      logger: Logger;
      courseId?: number;
      courseQuery?: string;
    } = { sessionPath, headless, logger };

    if (typeof cmd.courseId === 'number' && Number.isFinite(cmd.courseId)) {
      args.courseId = cmd.courseId as number;
    }
    if (typeof cmd.courseQuery === 'string' && cmd.courseQuery.trim()) {
      args.courseQuery = cmd.courseQuery as string;
    }

    await resolveLecture1Command(args);
  });

program
  .command('download-lecture1')
  .description('Download Lecture 1 (first chapter + first lesson) as a .ts file')
  .requiredOption('--course-id <id>', 'Course ID', (v) => Number(v))
  .option('--transcribe', 'Transcribe after download (writes *_transcription.txt next to the media file)', false)
  .option('--transcribe-language <code>', 'Language code to force during transcription (e.g. ja, en)')
  .option(
    '--no-speech-thold <n>',
    'whisper.cpp no-speech threshold (lower can reduce [BLANK_AUDIO], e.g. 0.2)',
    (v) => Number(v),
  )
  .option('--no-materials', 'Do not download materials (references/handouts)')
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const outputDir = (opts.output as string | undefined) ?? cfg.outputDir;
    const headless = (opts.headless as boolean | undefined) ?? cfg.puppeteerHeadless;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const args: {
      sessionPath: string;
      outputDir: string;
      headless: boolean;
      courseId: number;
      transcribe: boolean;
      transcribeLanguage?: string;
      noSpeechThreshold?: number;
      materials: boolean;
      logger: Logger;
    } = {
      sessionPath,
      outputDir,
      headless,
      courseId: cmd.courseId as number,
      transcribe: Boolean(cmd.transcribe),
      materials: Boolean(cmd.materials),
      logger,
    };

    if (cmd.transcribeLanguage) {
      args.transcribeLanguage = String(cmd.transcribeLanguage);
    }

    if (typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold)) {
      args.noSpeechThreshold = cmd.noSpeechThold as number;
    }

    await downloadLecture1Command(args);
  });

program
  .command('download')
  .description('Download lessons for a course (HLS -> .ts)')
  .requiredOption('--course-id <id>', 'Course ID', (v) => Number(v))
  .option('--chapter <id>', 'Chapter ID to include (repeatable)', (v, acc: number[]) => {
    acc.push(Number(v));
    return acc;
  }, [])
  .option('--max-concurrency <n>', 'Max API concurrency when resolving lesson URLs', (v) => Number(v), 6)
  .option('--first-lecture-only', 'Only download the first resolved lesson', false)
  .option('--transcribe', 'Transcribe after each download (writes *_transcription.txt next to the media file)', false)
  .option('--materials', 'Download lesson materials (writes an offline-openable index.html)', false)
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const outputDir = (opts.output as string | undefined) ?? cfg.outputDir;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const chapters = Array.isArray(cmd.chapter) && cmd.chapter.length > 0 ? (cmd.chapter as number[]) : undefined;
    const args: {
      sessionPath: string;
      outputDir: string;
      courseId: number;
      chapters?: number[];
      maxConcurrency: number;
      firstLectureOnly: boolean;
      transcribe: boolean;
      materials: boolean;
      logger: Logger;
    } = {
      sessionPath,
      outputDir,
      courseId: cmd.courseId as number,
      maxConcurrency: Number(cmd.maxConcurrency ?? 6),
      firstLectureOnly: Boolean(cmd.firstLectureOnly),
      transcribe: Boolean(cmd.transcribe),
      materials: Boolean(cmd.materials),
      logger,
    };
    if (chapters) args.chapters = chapters;
    await downloadCommand(args);
  });

program
  .command('setup-whisper')
  .description('Clone and build whisper.cpp, and download a model')
  .option('--model <name>', 'Whisper model name (tiny|base|small|medium|large)', 'base')
  .option('--force', 'Reinstall whisper.cpp even if it already exists', false)
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    await setupWhisperCommand({
      logger,
      model: String(cmd.model ?? 'base'),
      force: Boolean(cmd.force),
    });
  });

program
  .command('transcribe')
  .description('Transcribe a media file using whisper.cpp (uses ffmpeg to extract audio when needed)')
  .requiredOption('--input <path>', 'Input media file path')
  .option('--model <name>', 'Whisper model name', 'base')
  .option('--language <code>', 'Language code (optional)')
  .option(
    '--no-speech-thold <n>',
    'whisper.cpp no-speech threshold (lower can reduce [BLANK_AUDIO], e.g. 0.2)',
    (v) => Number(v),
  )
  .option('--format <fmt>', 'txt|srt|vtt', 'txt')
  .option('--max-seconds <n>', 'Only transcribe the first N seconds (useful for very large files)', (v) => Number(v))
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const format = String(cmd.format ?? 'txt') as 'txt' | 'srt' | 'vtt';

    const args: {
      inputPath: string;
      model: string;
      format: 'txt' | 'srt' | 'vtt';
      logger: Logger;
      language?: string;
      noSpeechThreshold?: number;
      maxSeconds?: number;
    } = {
      inputPath: String(cmd.input),
      model: String(cmd.model ?? 'base'),
      format,
      logger,
    };
    if (cmd.language) args.language = String(cmd.language);
    if (typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold)) {
      args.noSpeechThreshold = cmd.noSpeechThold as number;
    }
    if (typeof cmd.maxSeconds === 'number' && Number.isFinite(cmd.maxSeconds)) {
      args.maxSeconds = cmd.maxSeconds as number;
    }

    await transcribeCommand(args);
  });

await program.parseAsync(process.argv);
