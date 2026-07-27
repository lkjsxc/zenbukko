import { performance } from 'node:perf_hooks';
import { transcribeCommand } from './transcribe.js';
import type { Logger } from '../utils/log.js';
import { runCapturedProcess } from '../utils/process.js';
import { which } from '../utils/which.js';
import type { WhisperBackendRequest } from '../whisper/types.js';

export type WhisperBenchmarkResult = {
  success: boolean;
  backend?: string;
  device?: string;
  audioDurationSeconds?: number;
  wallDurationSeconds: number;
  realTimeFactor?: number;
  error?: string;
};

export async function benchmarkWhisperCommand(params: {
  inputPath: string;
  model: string;
  backend: WhisperBackendRequest;
  format: 'txt' | 'srt' | 'vtt';
  logger: Logger;
  write?: (value: string) => void;
  json: boolean;
}): Promise<WhisperBenchmarkResult> {
  const started = performance.now();
  try {
    const audioDurationSeconds = await mediaDuration(params.inputPath);
    const transcription = await transcribeCommand(params);
    const wallDurationSeconds = (performance.now() - started) / 1_000;
    const result: WhisperBenchmarkResult = {
      success: true, backend: transcription.runtime.backend, ...(transcription.runtime.capability.deviceName ? { device: transcription.runtime.capability.deviceName } : {}),
      audioDurationSeconds, wallDurationSeconds, realTimeFactor: wallDurationSeconds / audioDurationSeconds,
    };
    writeResult(result, params);
    return result;
  } catch (error) {
    const result: WhisperBenchmarkResult = { success: false, wallDurationSeconds: (performance.now() - started) / 1_000, error: error instanceof Error ? error.message : String(error) };
    writeResult(result, params);
    throw error;
  }
}

async function mediaDuration(inputPath: string): Promise<number> {
  const ffprobe = await which('ffprobe');
  if (!ffprobe) throw new Error('ffprobe is required for benchmark duration reporting. Install ffmpeg.');
  const result = await runCapturedProcess(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', inputPath], { timeoutMs: 10_000, maxOutputBytes: 4_096 });
  const duration = Number(result.stdout.trim());
  if (result.code !== 0 || !Number.isFinite(duration) || duration <= 0) throw new Error('Could not determine media duration with ffprobe.');
  return duration;
}

function writeResult(result: WhisperBenchmarkResult, params: { json: boolean; write?: (value: string) => void }): void {
  const write = params.write ?? ((value) => process.stdout.write(value));
  if (params.json) return write(`${JSON.stringify(result)}\n`);
  const duration = result.audioDurationSeconds?.toFixed(2) ?? 'n/a';
  const factor = result.realTimeFactor?.toFixed(3) ?? 'n/a';
  write(`Whisper benchmark: ${result.success ? 'success' : 'failure'}\nbackend=${result.backend ?? 'unresolved'}${result.device ? ` (${result.device})` : ''}\naudio=${duration}s wall=${result.wallDurationSeconds.toFixed(2)}s RTF=${factor}${result.error ? `\nerror=${result.error}` : ''}\n`);
}
