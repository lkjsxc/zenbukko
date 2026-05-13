import fs from 'node:fs/promises';
import type { OcrTask } from './plan.js';
import { normalizeMarkdown } from './text.js';
import type { OcrAttempt, OcrFinalBackend, OcrPdfResult, OcrRunMode } from './types.js';

export async function writeTaskMarkdown(params: {
  task: OcrTask;
  text: string;
  results: OcrPdfResult[];
  backend: OcrFinalBackend;
  mode: OcrRunMode;
  batchJobName?: string;
  artifactDir?: string;
  pageCount?: number;
  emptyPageCount?: number;
  elapsedMs?: number;
  rawOutputPaths?: string[];
  attempts?: OcrAttempt[];
}): Promise<void> {
  await fs.writeFile(params.task.markdownPath, normalizeMarkdown(params.text), 'utf8');
  params.results.push({
    pdfPath: params.task.pdfPath,
    markdownPath: params.task.markdownPath,
    status: 'written',
    backend: params.backend,
    finalBackend: params.backend,
    mode: params.mode,
    ...(params.batchJobName ? { batchJobName: params.batchJobName } : {}),
    ...(params.artifactDir ? { artifactDir: params.artifactDir } : {}),
    ...(typeof params.pageCount === 'number' ? { pageCount: params.pageCount } : {}),
    ...(typeof params.emptyPageCount === 'number' ? { emptyPageCount: params.emptyPageCount } : {}),
    ...(typeof params.elapsedMs === 'number' ? { elapsedMs: params.elapsedMs } : {}),
    ...(params.rawOutputPaths ? { rawOutputPaths: params.rawOutputPaths } : {}),
    ...(params.attempts ? { attempts: params.attempts } : {}),
  });
}
