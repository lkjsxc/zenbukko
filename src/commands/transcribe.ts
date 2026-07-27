import path from 'node:path';
import fs from 'node:fs/promises';
import type { Logger } from '../utils/log.js';
import { fileExists } from '../utils/fs.js';
import { runProcess } from '../utils/process.js';
import { inspectWhisperModel } from '../whisper/models.js';
import { resolveWhisperRuntime } from '../whisper/runtime.js';
import type { ResolvedWhisperRuntime, WhisperBackendRequest } from '../whisper/types.js';
import { getWhisperDir } from '../whisper/whisperPaths.js';
import { which } from '../utils/which.js';
import ffmpegStatic from 'ffmpeg-static';

async function resolveFfmpegPath(): Promise<string> {
  const systemFfmpeg = await which('ffmpeg');
  if (systemFfmpeg) return systemFfmpeg;
  const bundled = ffmpegStatic as unknown as string | null;
  if (bundled) return bundled;
  throw new Error('ffmpeg not found. Install ffmpeg or run via docker-compose.');
}

export async function preflightTranscription(params: { model: string; requireFfmpeg: boolean; backend?: WhisperBackendRequest }): Promise<ResolvedWhisperRuntime> {
  if (params.requireFfmpeg) await resolveFfmpegPath();
  const [runtime, model] = await Promise.all([resolveRuntime(params.backend), inspectWhisperModel(params.model)]);
  if (!model.valid) throw new Error(`Whisper model is unavailable: ${model.path} (${model.detail}). Run: zenbukko setup-whisper --model ${params.model}`);
  return runtime;
}

export type TranscriptionResult = { runtime: ResolvedWhisperRuntime; outputFile: string; audioPath: string };

export async function transcribeCommand(params: {
  inputPath: string;
  model: string;
  language?: string;
  noSpeechThreshold?: number;
  format: 'txt' | 'srt' | 'vtt';
  maxSeconds?: number;
  backend?: WhisperBackendRequest;
  logger: Logger;
}): Promise<TranscriptionResult> {
  const inputAbs = path.resolve(params.inputPath);
  if (!(await fileExists(inputAbs))) throw new Error(`Input file not found: ${inputAbs}`);
  const [runtime, model] = await Promise.all([resolveRuntime(params.backend), inspectWhisperModel(params.model)]);
  if (!model.valid) throw new Error(`Whisper model is unavailable: ${model.path} (${model.detail}). Run: zenbukko setup-whisper --model ${params.model}`);
  if (runtime.warning) params.logger.warn(runtime.warning);
  params.logger.info(`Whisper requested backend: ${runtime.requested}`);
  params.logger.info(`Whisper resolved backend: ${runtime.backend}${runtime.capability.deviceName ? ` (${runtime.capability.deviceName})` : ''}`);
  params.logger.info(`Whisper executable: ${runtime.executable}`);
  params.logger.info(`Whisper model: ${model.path}`);
  const audioPath = await extractAudio(inputAbs, params, params.logger);
  const ext = path.extname(inputAbs).toLowerCase();
  const base = path.join(path.dirname(inputAbs), path.basename(inputAbs, ext));
  const outBase = `${base}_transcription`;
  const args = ['-m', model.path, '-f', audioPath, '-of', outBase, '-l', params.language ?? 'auto'];
  if (typeof params.noSpeechThreshold === 'number' && Number.isFinite(params.noSpeechThreshold)) args.push('-nth', String(params.noSpeechThreshold));
  args.push(params.format === 'srt' ? '--output-srt' : params.format === 'vtt' ? '--output-vtt' : '--output-txt');
  await runProcess(runtime.executable, args, { cwd: getWhisperDir() });
  const outputFile = `${outBase}.${params.format}`;
  if (!(await fileExists(outputFile))) params.logger.warn(`Whisper finished but output not found where expected: ${outputFile}`);
  else params.logger.info(`Transcript written: ${outputFile}`);
  return { runtime, outputFile, audioPath };
}

function resolveRuntime(backend: WhisperBackendRequest | undefined): Promise<ResolvedWhisperRuntime> {
  return resolveWhisperRuntime(backend ? { requested: backend } : {});
}

async function extractAudio(inputPath: string, params: { maxSeconds?: number }, logger: Logger): Promise<string> {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.wav') return inputPath;
  const base = path.join(path.dirname(inputPath), path.basename(inputPath, ext));
  const audioPath = `${base}.wav`;
  logger.info(`Extracting audio via ffmpeg -> ${audioPath}`);
  await runProcess(await resolveFfmpegPath(), ['-nostdin', '-y', '-i', inputPath, ...(typeof params.maxSeconds === 'number' && Number.isFinite(params.maxSeconds) ? ['-t', String(params.maxSeconds)] : []), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audioPath]);
  if ((await fs.stat(audioPath)).size === 0) throw new Error(`Generated audio is empty: ${audioPath}`);
  return audioPath;
}
