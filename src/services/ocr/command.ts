import fs from 'node:fs/promises';
import path from 'node:path';
import { rebuildChapterOcr } from '../chapterOcr.js';
import { refreshMaterialsPdfsInTree } from '../materials/refresh.js';
import { writeAggregate } from './aggregate.js';
import { discoverPdfFiles } from './discovery.js';
import { writeOcrManifest } from './manifest.js';
import { planOcrTasks, type OcrTask } from './plan.js';
import { localOptions, runLocalTasks } from './localRunner.js';
import { preflightLocalOcr } from './preflight.js';
import type { LocalOcrPreflight, OcrCommandParams, OcrMaterialsResult, OcrPdfResult } from './types.js';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function ocrMaterialsCommand(params: OcrCommandParams): Promise<OcrMaterialsResult> {
  const inputDir = path.resolve(params.inputDir);
  const settings = localOptions(params);
  const refreshed = await refreshMaterialsPdfsInTree(inputDir, params.logger);
  if (refreshed > 0) params.logger.info(`Refreshed material PDFs from ${refreshed} manifest(s).`);
  const pdfs = await discoverPdfFiles(inputDir, params.logger);
  if (pdfs.length === 0) params.logger.warn(`No PDF files found for OCR: ${inputDir}`);
  const plan = await planOcrTasks({ pdfs, force: params.force });
  const results = skippedResults(plan.skipped);
  const runnable = await filterSizedTasks(plan.tasks, params.logger, results);
  const preflight = await runOrPreflight({ runnable, settings, params, results });
  const aggregatePath = await writeAggregate(inputDir, results, params.logger);
  const manifestPath = await writeOcrManifest(inputDir, { settings, preflight, pdfs, results, ...(aggregatePath ? { aggregatePath } : {}) });
  await rebuildChapterOcr({ inputDir, logger: params.logger });
  return { inputDir, runner: 'local', pdfs, results, ...(aggregatePath ? { aggregatePath } : {}), manifestPath, preflight };
}

function skippedResults(tasks: OcrTask[]): OcrPdfResult[] {
  return tasks.map((task) => ({
    pdfPath: task.pdfPath,
    markdownPath: task.markdownPath,
    status: 'skipped',
    runner: 'local',
    message: 'already exists',
  }));
}

async function filterSizedTasks(tasks: OcrTask[], logger: { warn: (message: string) => void }, results: OcrPdfResult[]): Promise<OcrTask[]> {
  const runnable: OcrTask[] = [];
  for (const task of tasks) {
    const size = await fs.stat(task.pdfPath).then((s) => s.size);
    if (size > MAX_PDF_BYTES) {
      const message = `PDF is larger than ${MAX_PDF_BYTES} bytes; skipping`;
      logger.warn(`${message}: ${task.pdfPath}`);
      results.push({ pdfPath: task.pdfPath, status: 'skipped', runner: 'local', message, diagnosticCode: 'pdf-too-large' });
    } else {
      runnable.push(task);
    }
  }
  return runnable;
}

async function runOrPreflight(params: {
  runnable: OcrTask[];
  settings: ReturnType<typeof localOptions>;
  params: OcrCommandParams;
  results: OcrPdfResult[];
}): Promise<LocalOcrPreflight> {
  if (params.runnable.length === 0) return preflightLocalOcr(params.settings);
  return runLocalTasks({ tasks: params.runnable, settings: params.settings, commandParams: params.params, results: params.results });
}
