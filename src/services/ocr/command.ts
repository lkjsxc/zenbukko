import fs from 'node:fs/promises';
import path from 'node:path';
import { rebuildChapterOcr } from '../chapterOcr.js';
import { refreshMaterialsPdfsInTree } from '../materials/refresh.js';
import { writeAggregate } from './aggregate.js';
import { discoverPdfFiles } from './discovery.js';
import { writeOcrManifest } from './manifest.js';
import { planOcrTasks, type OcrTask } from './plan.js';
import { runAutoTasks } from './autoRunner.js';
import { runGeminiTasks } from './geminiRunner.js';
import { runLocalTasks, localOptions } from './localRunner.js';
import type { OcrCommandParams, OcrMaterialsResult, OcrPdfResult } from './types.js';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function ocrMaterialsCommand(params: OcrCommandParams): Promise<OcrMaterialsResult> {
  const inputDir = path.resolve(params.inputDir);
  const backend = params.backend ?? 'auto';
  const refreshed = await refreshMaterialsPdfsInTree(inputDir, params.logger);
  if (refreshed > 0) params.logger.info(`Refreshed material PDFs from ${refreshed} manifest(s).`);
  const pdfs = await discoverPdfFiles(inputDir, params.logger);
  if (pdfs.length === 0) params.logger.warn(`No PDF files found for OCR: ${inputDir}`);
  const plan = await planOcrTasks({ pdfs, force: params.force, mode: params.mode ?? 'auto' });
  const results: OcrPdfResult[] = plan.skipped.map((t) => ({
    pdfPath: t.pdfPath,
    markdownPath: t.markdownPath,
    status: 'skipped',
    backend,
    message: 'already exists',
  }));

  const runnable = await filterSizedTasks(plan.tasks, params.logger, results, backend);
  if (backend === 'gemini') await runGeminiTasks(runnable, plan.mode, params, results);
  else if (backend === 'auto') await runAutoTasks(runnable, params, results);
  else await runLocalTasks(runnable, params, results);

  const aggregatePath = await writeAggregate(inputDir, results, params.logger);
  const manifestPath = await writeOcrManifest(inputDir, manifestFields(backend, plan.mode, pdfs, results, aggregatePath, params));
  await rebuildChapterOcr({ inputDir, logger: params.logger });
  return { inputDir, backend, pdfs, results, ...(aggregatePath ? { aggregatePath } : {}), manifestPath };
}

async function filterSizedTasks(tasks: OcrTask[], logger: { warn: (message: string) => void }, results: OcrPdfResult[], backend: 'auto' | 'local' | 'gemini'): Promise<OcrTask[]> {
  const runnable: OcrTask[] = [];
  for (const task of tasks) {
    const size = await fs.stat(task.pdfPath).then((s) => s.size);
    if (size > MAX_PDF_BYTES) {
      const message = `PDF is larger than ${MAX_PDF_BYTES} bytes; skipping`;
      logger.warn(`${message}: ${task.pdfPath}`);
      results.push({ pdfPath: task.pdfPath, status: 'skipped', backend, message });
    } else {
      runnable.push(task);
    }
  }
  return runnable;
}

function manifestFields(backend: 'auto' | 'local' | 'gemini', plannedMode: string, pdfs: string[], results: OcrPdfResult[], aggregatePath: string | undefined, params: OcrCommandParams) {
  const local = localOptions(params);
  return {
    ocrBackend: backend,
    backend,
    ...(backend !== 'local' ? { model: params.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite' } : {}),
    requestedMode: params.mode ?? 'auto',
    plannedMode,
    serviceTier: params.serviceTier ?? 'flex',
    localCommand: local.command,
    localDevice: local.device,
    pageDpi: local.pageDpi,
    ndlocrEnableTcy: local.enableTcy,
    pdfs,
    results,
    ...(aggregatePath ? { aggregatePath } : {}),
  };
}
