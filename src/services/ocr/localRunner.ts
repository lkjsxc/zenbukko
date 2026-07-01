import path from 'node:path';
import type { OcrTask } from './plan.js';
import { LocalOcrError, runLocalOcrTask, type LocalOcrOutput } from './local.js';
import { preflightLocalOcr } from './preflight.js';
import { writeTaskMarkdown } from './resultWriter.js';
import type { LocalOcrPreflight, LocalOcrSettings, OcrCommandParams, OcrPdfResult } from './types.js';

export function localOptions(params: Partial<OcrCommandParams>): LocalOcrSettings {
  return {
    command: params.ndlocrCommand ?? process.env.ZENBUKKO_NDLOCR_CMD ?? 'ndlocr-lite',
    device: params.ndlocrDevice ?? 'cpu',
    pageDpi: params.ocrPageDpi ?? 300,
    keepIntermediates: params.ocrKeepIntermediates ?? false,
    enableTcy: params.ndlocrEnableTcy ?? true,
  };
}

export async function runLocalTasks(params: {
  tasks: OcrTask[];
  settings: LocalOcrSettings;
  commandParams: OcrCommandParams;
  results: OcrPdfResult[];
}): Promise<LocalOcrPreflight> {
  const preflight = await preflightLocalOcr(params.settings);
  if (!preflight.ok) {
    for (const task of params.tasks) pushPreflightFailure(task, preflight, params.results);
    return preflight;
  }
  for (const task of params.tasks) await runOne(task, params.settings, params.commandParams, params.results);
  return preflight;
}

async function runOne(task: OcrTask, settings: LocalOcrSettings, params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  try {
    const output = await runOneLocalTask(task, settings, params);
    await writeLocalSuccess(task, output, results);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const diagnosticCode = e instanceof LocalOcrError ? e.diagnosticCode : 'unexpected-local-ocr-error';
    params.logger.error(`Local OCR failed for ${task.pdfPath}: ${message}`);
    results.push({ pdfPath: task.pdfPath, status: 'failed', message, diagnosticCode, runner: 'local' });
  }
}

export async function runOneLocalTask(task: OcrTask, settings: LocalOcrSettings, params: OcrCommandParams): Promise<LocalOcrOutput> {
  params.logger.info(`Running local OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
  return runLocalOcrTask({ task, ...settings });
}

export async function writeLocalSuccess(task: OcrTask, output: LocalOcrOutput, results: OcrPdfResult[]): Promise<void> {
  await writeTaskMarkdown({
    task,
    text: output.markdown,
    results,
    pageCount: output.pageCount,
    emptyPageCount: output.emptyPageCount,
    elapsedMs: output.elapsedMs,
    ...(output.artifactDir ? { artifactDir: output.artifactDir } : {}),
    ...(output.rawOutputPaths ? { rawOutputPaths: output.rawOutputPaths } : {}),
  });
}

function pushPreflightFailure(task: OcrTask, preflight: LocalOcrPreflight, results: OcrPdfResult[]): void {
  const first = preflight.diagnostics.find((d) => d.code !== 'unexpected-local-ocr-error') ?? preflight.diagnostics[0];
  results.push({
    pdfPath: task.pdfPath,
    markdownPath: task.markdownPath,
    status: 'failed',
    runner: 'local',
    message: first?.message ?? 'Local OCR preflight failed.',
    diagnosticCode: first?.code ?? 'unexpected-local-ocr-error',
  });
}
