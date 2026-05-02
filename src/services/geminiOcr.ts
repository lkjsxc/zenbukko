import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { batchOcrPdfs } from './geminiOcrBatch.js';
import { discoverPdfFiles } from './geminiOcrDiscovery.js';
import { flexOcrPdf } from './geminiOcrFlex.js';
import { normalizeMarkdown } from './geminiOcrMarkdown.js';
import { planOcrTasks, type OcrMode, type OcrServiceTier, type OcrTask } from './geminiOcrPlan.js';
import { refreshMaterialsPdfsInTree } from './materials/refresh.js';
import { writeAggregate } from './geminiOcrAggregate.js';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export type OcrPdfResult = {
  pdfPath: string;
  markdownPath?: string;
  status: 'written' | 'skipped' | 'failed';
  message?: string;
  mode?: 'batch' | 'flex';
  batchJobName?: string;
};

export type OcrMaterialsResult = {
  inputDir: string;
  pdfs: string[];
  results: OcrPdfResult[];
  aggregatePath?: string;
  manifestPath: string;
};

export async function ocrMaterialsCommand(params: {
  inputDir: string;
  apiKey?: string;
  model: string;
  force: boolean;
  mode?: OcrMode;
  serviceTier?: OcrServiceTier;
  retries?: number;
  timeoutMs?: number;
  logger: { info: (message: string) => void; warn: (message: string) => void; error: (message: string) => void };
}): Promise<OcrMaterialsResult> {
  const inputDir = path.resolve(params.inputDir);
  const apiKey = params.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for PDF OCR.');

  const refreshed = await refreshMaterialsPdfsInTree(inputDir, params.logger);
  if (refreshed > 0) params.logger.info(`Refreshed material PDFs from ${refreshed} manifest(s).`);
  const pdfs = await discoverPdfFiles(inputDir);
  if (pdfs.length === 0) params.logger.warn(`No PDF files found for OCR: ${inputDir}`);
  const plan = await planOcrTasks({ pdfs, force: params.force, mode: params.mode ?? 'auto' });
  const ai = new GoogleGenAI({ apiKey });
  const results: OcrPdfResult[] = plan.skipped.map((t) => ({
    pdfPath: t.pdfPath,
    markdownPath: t.markdownPath,
    status: 'skipped',
    message: 'already exists',
  }));

  const runnable = await filterSizedTasks(plan.tasks, params.logger, results);
  if (runnable.length > 0 && plan.mode === 'batch') {
    await runBatchWithRecovery(ai, runnable, params, results);
  } else {
    await runFlexTasks(ai, runnable, params, results);
  }

  const aggregatePath = await writeAggregate(inputDir, results, params.logger);
  const manifestPath = await writeManifest(inputDir, {
    model: params.model,
    requestedMode: params.mode ?? 'auto',
    plannedMode: plan.mode,
    serviceTier: params.serviceTier ?? 'flex',
    pdfs,
    results,
    aggregatePath,
  });
  return { inputDir, pdfs, results, ...(aggregatePath ? { aggregatePath } : {}), manifestPath };
}

async function filterSizedTasks(
  tasks: OcrTask[],
  logger: { warn: (message: string) => void },
  results: OcrPdfResult[],
): Promise<OcrTask[]> {
  const runnable: OcrTask[] = [];
  for (const task of tasks) {
    const size = await fs.stat(task.pdfPath).then((s) => s.size);
    if (size > MAX_PDF_BYTES) {
      const message = `PDF is larger than ${MAX_PDF_BYTES} bytes; skipping`;
      logger.warn(`${message}: ${task.pdfPath}`);
      results.push({ pdfPath: task.pdfPath, status: 'skipped', message });
    } else {
      runnable.push(task);
    }
  }
  return runnable;
}

async function runBatchWithRecovery(
  ai: GoogleGenAI,
  tasks: OcrTask[],
  params: Parameters<typeof ocrMaterialsCommand>[0],
  results: OcrPdfResult[],
): Promise<void> {
  params.logger.info(`Starting Gemini Batch OCR for ${tasks.length} PDF(s).`);
  const batch = await batchOcrPdfs({ ai, tasks, model: params.model, timeoutMs: params.timeoutMs ?? 900_000 });
  const failed: OcrTask[] = [];
  for (const task of tasks) {
    const text = batch.texts.get(task.pdfPath);
    if (text) await writeTaskMarkdown(task, text, results, 'batch', batch.batchJobName);
    else {
      const message = batch.errors.get(task.pdfPath) ?? 'Batch item missing from response.';
      params.logger.warn(`Batch OCR failed; retrying with Flex: ${task.pdfPath} (${message})`);
      failed.push(task);
    }
  }
  await runFlexTasks(ai, failed, params, results);
}

async function runFlexTasks(
  ai: GoogleGenAI,
  tasks: OcrTask[],
  params: Parameters<typeof ocrMaterialsCommand>[0],
  results: OcrPdfResult[],
): Promise<void> {
  for (const task of tasks) {
    try {
      params.logger.info(`Running Gemini Flex OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
      const text = await flexOcrPdf({
        ai,
        pdfPath: task.pdfPath,
        model: params.model,
        serviceTier: params.serviceTier ?? 'flex',
        retries: params.retries ?? 3,
        timeoutMs: params.timeoutMs ?? 900_000,
      });
      await writeTaskMarkdown(task, text, results, 'flex');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      params.logger.error(`OCR failed for ${task.pdfPath}: ${message}`);
      results.push({ pdfPath: task.pdfPath, status: 'failed', message, mode: 'flex' });
    }
  }
}

async function writeTaskMarkdown(
  task: OcrTask,
  text: string,
  results: OcrPdfResult[],
  mode: 'batch' | 'flex',
  batchJobName?: string,
): Promise<void> {
  await fs.writeFile(task.markdownPath, normalizeMarkdown(text), 'utf8');
  results.push({ pdfPath: task.pdfPath, markdownPath: task.markdownPath, status: 'written', mode, ...(batchJobName ? { batchJobName } : {}) });
}

async function writeManifest(inputDir: string, manifest: Record<string, unknown>): Promise<string> {
  const manifestPath = path.join(inputDir, 'materials_ocr_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...manifest }, null, 2), 'utf8');
  return manifestPath;
}
