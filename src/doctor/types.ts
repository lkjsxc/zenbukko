export type DoctorStatus = 'pass' | 'warn' | 'fail';

export type DoctorCheck = {
  id: string;
  label: string;
  status: DoctorStatus;
  detail: string;
  hint?: string;
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
  whisperPath: string | null;
  whisperModelPath: string;
  whisperModelExists: boolean;
  sessionPath: string;
  sessionExists: boolean;
  outputDir: string;
  outputWritable: boolean;
  webIndexPath: string;
  webIndexExists: boolean;
};

export type DoctorReport = {
  ok: boolean;
  platform: string;
  nodeVersion: string;
  checks: DoctorCheck[];
};
