import path from 'node:path';
import fs from 'node:fs/promises';
import type { Logger } from '../utils/log.js';
import { fileExists } from '../utils/fs.js';
import { runProcess } from '../utils/process.js';
import { resolveModelPath, resolveWhisperBinary, getWhisperDir } from '../whisper/whisperPaths.js';
import { which } from '../utils/which.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import ffmpegStatic from 'ffmpeg-static';

async function resolveFfmpegPath(): Promise<string> {
  const systemFfmpeg = await which('ffmpeg');
  if (systemFfmpeg) return systemFfmpeg;
  const bundled = ffmpegStatic as unknown as string | null;
  if (bundled) return bundled;
  throw new Error('ffmpeg not found. Install ffmpeg or run via docker-compose.');
}

export async function preflightTranscription(params: {
  model: string;
  requireFfmpeg: boolean;
}): Promise<void> {
  if (params.requireFfmpeg) {
    await resolveFfmpegPath();
  }

  await resolveWhisperBinary();
  const modelPath = resolveModelPath(params.model);
  if (!(await fileExists(modelPath))) {
    throw new Error(`Whisper model not found: ${modelPath}. Run: zenbukko setup-whisper --model ${params.model}`);
  }
}

export async function transcribeCommand(params: {
  inputPath: string;
  model: string;
  language?: string;
  noSpeechThreshold?: number;
  format: 'txt' | 'srt' | 'vtt';
  maxSeconds?: number;
  logger: Logger;
}): Promise<void> {
  const inputAbs = path.resolve(params.inputPath);
  if (!(await fileExists(inputAbs))) {
    throw new Error(`Input file not found: ${inputAbs}`);
  }

  const whisperBin = await resolveWhisperBinary();
  const modelPath = resolveModelPath(params.model);
  if (!(await fileExists(modelPath))) {
    throw new Error(`Whisper model not found: ${modelPath}. Run: zenbukko setup-whisper --model ${params.model}`);
  }

  const ext = path.extname(inputAbs).toLowerCase();
  const base = path.join(path.dirname(inputAbs), path.basename(inputAbs, ext));

  let audioPath = inputAbs;
  if (ext !== '.wav') {
    const ffmpegPath = await resolveFfmpegPath();

    audioPath = `${base}.wav`;
    params.logger.info(`Extracting audio via ffmpeg -> ${audioPath}`);

    await runProcess(ffmpegPath, [
      '-nostdin',
      '-y',
      '-i',
      inputAbs,
      ...(typeof params.maxSeconds === 'number' && Number.isFinite(params.maxSeconds)
        ? ['-t', String(params.maxSeconds)]
        : []),
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'pcm_s16le',
      audioPath,
    ]);

    // Ensure file exists and is non-empty
    const st = await fs.stat(audioPath);
    if (st.size === 0) throw new Error(`Generated audio is empty: ${audioPath}`);
  }

  const outBase = `${base}_transcription`;
  const args = ['-m', modelPath, '-f', audioPath, '-of', outBase];

  // whisper.cpp defaults language to "en"; explicitly use auto-detect unless the user overrides.
  args.push('-l', params.language ?? 'auto');

  if (typeof params.noSpeechThreshold === 'number' && Number.isFinite(params.noSpeechThreshold)) {
    args.push('-nth', String(params.noSpeechThreshold));
  }

  if (params.format === 'srt') args.push('--output-srt');
  else if (params.format === 'vtt') args.push('--output-vtt');
  else args.push('--output-txt');

  params.logger.info(`Running whisper: ${path.basename(whisperBin)}`);
  await runProcess(whisperBin, args, { cwd: getWhisperDir() });

  const outFile = `${outBase}.${params.format}`;
  if (!(await fileExists(outFile))) {
    params.logger.warn(`Whisper finished but output not found where expected: ${outFile}`);
  } else {
    params.logger.info(`Transcript written: ${outFile}`);
  }
}
