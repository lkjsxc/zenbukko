import type { OcrTask } from './plan.js';
import { writeTextAtomic } from './atomic.js';
import { normalizeMarkdown } from './text.js';
import type { OcrPdfResult } from './types.js';

export async function writeTaskMarkdown(params: {
  task: OcrTask;
  text: string;
  results: OcrPdfResult[];
  artifactDir?: string;
  pageCount?: number;
  emptyPageCount?: number;
  elapsedMs?: number;
  rawOutputPaths?: string[];
}): Promise<void> {
  await writeTextAtomic(params.task.markdownPath, normalizeMarkdown(params.text));
  params.results.push({
    pdfPath: params.task.pdfPath,
    markdownPath: params.task.markdownPath,
    status: 'written',
    runner: 'local',
    ...(params.artifactDir ? { artifactDir: params.artifactDir } : {}),
    ...(typeof params.pageCount === 'number' ? { pageCount: params.pageCount } : {}),
    ...(typeof params.emptyPageCount === 'number' ? { emptyPageCount: params.emptyPageCount } : {}),
    ...(typeof params.elapsedMs === 'number' ? { elapsedMs: params.elapsedMs } : {}),
    ...(params.rawOutputPaths ? { rawOutputPaths: params.rawOutputPaths } : {}),
  });
}
