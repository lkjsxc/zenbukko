import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists, readTextFileIfExists } from '../utils/fs.js';

export type CleanupResult = {
  deleted: string[];
  skipped: string[];
};

export async function deleteMediaArtifactsAfterTranscript(params: {
  mediaPath: string;
  transcriptPath: string;
  logger: { info: (message: string) => void; warn: (message: string) => void };
}): Promise<CleanupResult> {
  const result: CleanupResult = { deleted: [], skipped: [] };
  const transcriptOk = await hasUsableTranscript(params.transcriptPath);
  if (!transcriptOk) {
    result.skipped.push(params.mediaPath);
    params.logger.warn(`Skipping media cleanup because transcript is missing or empty: ${params.transcriptPath}`);
    return result;
  }

  for (const filePath of mediaArtifactsFor(params.mediaPath)) {
    if (!(await fileExists(filePath))) {
      result.skipped.push(filePath);
      continue;
    }

    await fs.unlink(filePath);
    result.deleted.push(filePath);
    params.logger.info(`Deleted media artifact after transcription: ${path.relative(process.cwd(), filePath)}`);
  }

  return result;
}

function mediaArtifactsFor(mediaPath: string): string[] {
  const ext = path.extname(mediaPath);
  const base = path.join(path.dirname(mediaPath), path.basename(mediaPath, ext));
  return [mediaPath, `${base}.wav`];
}

async function hasUsableTranscript(transcriptPath: string): Promise<boolean> {
  const ext = path.extname(transcriptPath).toLowerCase();
  const text = (await readTextFileIfExists(transcriptPath)) ?? '';
  const normalized = text.trim();
  if (!normalized) return false;
  if (ext === '.txt' && normalized === '[BLANK_AUDIO]') return false;
  return true;
}
