#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { Logger } from './utils/log.js';
import { authCommand } from './commands/auth.js';
import { listCoursesCommand } from './commands/listCourses.js';
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
  .command('download')
  .description('Download lessons for a course (HLS -> .ts)')
  .requiredOption('--course-id <id>', 'Course ID', (v) => Number(v))
  .option('--chapter <id>', 'Chapter ID to include (repeatable)', (v, acc: number[]) => {
    acc.push(Number(v));
    return acc;
  }, [])
  .option('--lesson-id <id>', 'Lesson ID to include (repeatable)', (v, acc: number[]) => {
    acc.push(Number(v));
    return acc;
  }, [])
  .option('--max-concurrency <n>', 'Max API concurrency when resolving lesson URLs', (v) => Number(v), 6)
  .option('--first-lecture-only', 'Only download the first resolved lesson', false)
  .option('--transcribe', 'Transcribe after each download (writes *_transcription.txt next to the media file)', false)
  .option('--transcribe-model <name>', 'Whisper model name', 'base')
  .option('--transcribe-format <fmt>', 'txt|srt|vtt', 'txt')
  .option('--transcribe-language <code>', 'Language code to force during transcription (e.g. ja, en)', 'ja')
  .option(
    '--no-speech-thold <n>',
    'whisper.cpp no-speech threshold (lower can reduce [BLANK_AUDIO], e.g. 0.2)',
    (v) => Number(v),
  )
  .option('--max-seconds <n>', 'Only transcribe the first N seconds (useful for very large files)', (v) => Number(v))
  .option('--materials', 'Download lesson materials (writes an offline-openable index.html)', false)
  .action(async (cmd) => {
    const cfg = loadConfig();
    const opts = program.opts();
    const sessionPath = (opts.session as string | undefined) ?? cfg.sessionPath;
    const outputDir = (opts.output as string | undefined) ?? cfg.outputDir;
    const logLevel = (opts.logLevel as typeof cfg.logLevel | undefined) ?? cfg.logLevel;
    const logger = new Logger(logLevel);

    const chapters = Array.isArray(cmd.chapter) && cmd.chapter.length > 0 ? (cmd.chapter as number[]) : undefined;
    const lessonIds = Array.isArray(cmd.lessonId) && cmd.lessonId.length > 0 ? (cmd.lessonId as number[]) : undefined;
    const args: {
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
    } = {
      sessionPath,
      outputDir,
      courseId: cmd.courseId as number,
      maxConcurrency: Number(cmd.maxConcurrency ?? 6),
      firstLectureOnly: Boolean(cmd.firstLectureOnly) && !(lessonIds && lessonIds.length > 0),
      transcribe: Boolean(cmd.transcribe),
      transcribeModel: String(cmd.transcribeModel ?? 'base'),
      transcribeFormat: String(cmd.transcribeFormat ?? 'txt') as 'txt' | 'srt' | 'vtt',
      materials: Boolean(cmd.materials),
      logger,
    };
    if (chapters) args.chapters = chapters;
    if (lessonIds) args.lessonIds = lessonIds;
    if (typeof cmd.transcribeLanguage === 'string' && cmd.transcribeLanguage.trim()) {
      args.transcribeLanguage = String(cmd.transcribeLanguage);
    }
    if (typeof cmd.noSpeechThold === 'number' && Number.isFinite(cmd.noSpeechThold)) {
      args.noSpeechThreshold = cmd.noSpeechThold as number;
    }
    if (typeof cmd.maxSeconds === 'number' && Number.isFinite(cmd.maxSeconds)) {
      args.maxSeconds = cmd.maxSeconds as number;
    }
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
