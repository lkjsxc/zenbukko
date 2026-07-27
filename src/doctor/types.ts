import type { BackendCapability, ResolvedWhisperRuntime, WhisperExecutable } from '../whisper/types.js';

export type DoctorStatus = 'pass' | 'warn' | 'fail';

export type DoctorCheck = { id: string; label: string; status: DoctorStatus; detail: string; hint?: string };

export type WhisperDoctorSnapshot = {
  requested: string;
  requestedValid: boolean;
  resolved: ResolvedWhisperRuntime | null;
  resolutionError?: string;
  executables: WhisperExecutable[];
  capabilities: BackendCapability[];
  modelPath: string;
  modelExists: boolean;
  modelValid: boolean;
  modelDetail: string;
  cpuFallbackAvailable: boolean;
};

export type DoctorSnapshot = {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  npmPath: string | null;
  pnpmPath: string | null;
  browserPath: string | null;
  browserError?: string;
  ffmpegPath: string | null;
  pdftoppmPath: string | null;
  ndlocrPath: string | null;
  whisper: WhisperDoctorSnapshot;
  sessionPath: string;
  sessionExists: boolean;
  outputDir: string;
  outputWritable: boolean;
  webIndexPath: string;
  webIndexExists: boolean;
};

export type DoctorReport = { ok: boolean; platform: string; nodeVersion: string; checks: DoctorCheck[] };
