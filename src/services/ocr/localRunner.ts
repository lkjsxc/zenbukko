import path from 'node:path';
import type { OcrTask } from './plan.js';
import { runLocalOcrTask, type LocalOcrOutput } from './local.js';
import { writeTaskMarkdown } from './resultWriter.js';
import type { OcrAttempt, OcrCommandParams, OcrPdfResult } from './types.js';

export function localOptions(params: OcrCommandParams) {
  return {
    command: params.ndlocrCommand ?? process.env.ZENBUKKO_NDLOCR_CMD ?? 'ndlocr-lite',
    device: params.ndlocrDevice ?? 'cpu',
    pageDpi: params.ocrPageDpi ?? 300,
    keepIntermediates: params.ocrKeepIntermediates ?? false,
    enableTcy: params.ndlocrEnableTcy ?? true,
  };
}

export async function runLocalTasks(tasks: OcrTask[], params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  for (const task of tasks) {
    try {
      const output = await runOneLocalTask(task, params);
      await writeLocalSuccess(task, output, results);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      params.logger.error(`Local OCR failed for ${task.pdfPath}: ${message}`);
      results.push({ pdfPath: task.pdfPath, status: 'failed', backend: 'local', message, mode: 'local' });
    }
  }
}

export async function runOneLocalTask(task: OcrTask, params: OcrCommandParams): Promise<LocalOcrOutput> {
  params.logger.info(`Running local OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
  return runLocalOcrTask({ task, ...localOptions(params) });
}

export async function writeLocalSuccess(
  task: OcrTask,
  output: LocalOcrOutput,
  results: OcrPdfResult[],
  attempts?: OcrAttempt[],
): Promise<void> {
  await writeTaskMarkdown({
    task,
    text: output.markdown,
    results,
    backend: 'local',
    mode: 'local',
    pageCount: output.pageCount,
    emptyPageCount: output.emptyPageCount,
    elapsedMs: output.elapsedMs,
    ...(output.artifactDir ? { artifactDir: output.artifactDir } : {}),
    ...(output.rawOutputPaths ? { rawOutputPaths: output.rawOutputPaths } : {}),
    ...(attempts ? { attempts } : {}),
  });
}
