import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { rebuildChapterOcr } from '../chapterOcr.js';
import { refreshMaterialsPdfsInTree } from '../materials/refresh.js';
import { writeAggregate } from './aggregate.js';
import { discoverPdfFiles } from './discovery.js';
import { writeOcrManifest } from './manifest.js';
import { planOcrTasks, type OcrTask } from './plan.js';
import { batchOcrPdfs } from './providers/geminiBatch.js';
import { flexOcrPdf } from './providers/geminiFlex.js';
import { runLocalOcrTask } from './local.js';
import { normalizeMarkdown } from './text.js';
import type { OcrCommandParams, OcrMaterialsResult, OcrPdfResult } from './types.js';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function ocrMaterialsCommand(params: OcrCommandParams): Promise<OcrMaterialsResult> {
  const inputDir = path.resolve(params.inputDir);
  const backend = params.backend ?? 'local';
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
  else await runLocalTasks(runnable, params, results);

  const aggregatePath = await writeAggregate(inputDir, results, params.logger);
  const manifestPath = await writeOcrManifest(inputDir, manifestFields(backend, plan.mode, pdfs, results, aggregatePath, params));
  await rebuildChapterOcr({ inputDir, logger: params.logger });
  return { inputDir, backend, pdfs, results, ...(aggregatePath ? { aggregatePath } : {}), manifestPath };
}

async function filterSizedTasks(tasks: OcrTask[], logger: { warn: (message: string) => void }, results: OcrPdfResult[], backend: 'local' | 'gemini'): Promise<OcrTask[]> {
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

async function runGeminiTasks(tasks: OcrTask[], mode: 'batch' | 'flex', params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  const apiKey = params.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required when OCR backend is gemini.');
  const model = params.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';
  const ai = new GoogleGenAI({ apiKey });
  if (tasks.length > 0 && mode === 'batch') {
    params.logger.info(`Starting Gemini Batch OCR for ${tasks.length} PDF(s).`);
    const batch = await batchOcrPdfs({ ai, tasks, model, timeoutMs: params.timeoutMs ?? 900_000 });
    const failed: OcrTask[] = [];
    for (const task of tasks) {
      const text = batch.texts.get(task.pdfPath);
      if (text) await writeTaskMarkdown(task, text, results, 'gemini', 'batch', batch.batchJobName);
      else {
        const message = batch.errors.get(task.pdfPath) ?? 'Batch item missing from response.';
        params.logger.warn(`Batch OCR failed; retrying with Flex: ${task.pdfPath} (${message})`);
        failed.push(task);
      }
    }
    await runGeminiFlexTasks(ai, failed, model, params, results);
  } else {
    await runGeminiFlexTasks(ai, tasks, model, params, results);
  }
}

async function runGeminiFlexTasks(ai: GoogleGenAI, tasks: OcrTask[], model: string, params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  for (const task of tasks) {
    try {
      params.logger.info(`Running Gemini Flex OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
      const text = await flexOcrPdf({
        ai,
        pdfPath: task.pdfPath,
        model,
        serviceTier: params.serviceTier ?? 'flex',
        retries: params.retries ?? 3,
        timeoutMs: params.timeoutMs ?? 900_000,
      });
      await writeTaskMarkdown(task, text, results, 'gemini', 'flex');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      params.logger.error(`OCR failed for ${task.pdfPath}: ${message}`);
      results.push({ pdfPath: task.pdfPath, status: 'failed', backend: 'gemini', message, mode: 'flex' });
    }
  }
}

async function runLocalTasks(tasks: OcrTask[], params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  for (const task of tasks) {
    try {
      params.logger.info(`Running local OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
      const output = await runLocalOcrTask({
        task,
        command: params.ndlocrCommand ?? process.env.ZENBUKKO_NDLOCR_CMD ?? 'ndlocr-lite',
        device: params.ndlocrDevice ?? 'cpu',
        pageDpi: params.ocrPageDpi ?? 200,
        keepIntermediates: params.ocrKeepIntermediates ?? false,
        enableTcy: params.ndlocrEnableTcy ?? false,
      });
      await writeTaskMarkdown(task, output.markdown, results, 'local', 'local', undefined, output.artifactDir);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      params.logger.error(`Local OCR failed for ${task.pdfPath}: ${message}`);
      results.push({ pdfPath: task.pdfPath, status: 'failed', backend: 'local', message, mode: 'local' });
    }
  }
}

async function writeTaskMarkdown(task: OcrTask, text: string, results: OcrPdfResult[], backend: 'local' | 'gemini', mode: 'batch' | 'flex' | 'local', batchJobName?: string, artifactDir?: string): Promise<void> {
  await fs.writeFile(task.markdownPath, normalizeMarkdown(text), 'utf8');
  results.push({ pdfPath: task.pdfPath, markdownPath: task.markdownPath, status: 'written', backend, mode, ...(batchJobName ? { batchJobName } : {}), ...(artifactDir ? { artifactDir } : {}) });
}

function manifestFields(backend: 'local' | 'gemini', plannedMode: string, pdfs: string[], results: OcrPdfResult[], aggregatePath: string | undefined, params: OcrCommandParams) {
  if (backend === 'gemini') {
    return {
      backend,
      ...(params.model ? { model: params.model } : {}),
      requestedMode: params.mode ?? 'auto',
      plannedMode,
      serviceTier: params.serviceTier ?? 'flex',
      pdfs,
      results,
      ...(aggregatePath ? { aggregatePath } : {}),
    };
  }
  return {
    backend,
    localCommand: params.ndlocrCommand ?? process.env.ZENBUKKO_NDLOCR_CMD ?? 'ndlocr-lite',
    localDevice: params.ndlocrDevice ?? 'cpu',
    pageDpi: params.ocrPageDpi ?? 200,
    pdfs,
    results,
    ...(aggregatePath ? { aggregatePath } : {}),
  };
}
