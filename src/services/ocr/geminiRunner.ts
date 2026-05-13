import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import type { OcrTask } from './plan.js';
import { batchOcrPdfs } from './providers/geminiBatch.js';
import { flexOcrPdf } from './providers/geminiFlex.js';
import { writeTaskMarkdown } from './resultWriter.js';
import type { OcrCommandParams, OcrPdfResult } from './types.js';

export function geminiRuntime(params: OcrCommandParams): { ai: GoogleGenAI; model: string } {
  const apiKey = params.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required when OCR backend needs Gemini.');
  return {
    ai: new GoogleGenAI({ apiKey }),
    model: params.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite',
  };
}

export async function runGeminiTasks(
  tasks: OcrTask[],
  mode: 'batch' | 'flex',
  params: OcrCommandParams,
  results: OcrPdfResult[],
): Promise<void> {
  const { ai, model } = geminiRuntime(params);
  if (tasks.length > 0 && mode === 'batch') {
    params.logger.info(`Starting Gemini Batch OCR for ${tasks.length} PDF(s).`);
    const batch = await batchOcrPdfs({ ai, tasks, model, timeoutMs: params.timeoutMs ?? 900_000 });
    const failed: OcrTask[] = [];
    for (const task of tasks) {
      const text = batch.texts.get(task.pdfPath);
      if (text) {
        await writeTaskMarkdown({
          task,
          text,
          results,
          backend: 'gemini',
          mode: 'batch',
          ...(batch.batchJobName ? { batchJobName: batch.batchJobName } : {}),
        });
      }
      else {
        params.logger.warn(`Batch OCR failed; retrying with Flex: ${task.pdfPath} (${batch.errors.get(task.pdfPath) ?? 'missing'})`);
        failed.push(task);
      }
    }
    await runGeminiFlexTasks({ ai, tasks: failed, model, params, results });
  } else {
    await runGeminiFlexTasks({ ai, tasks, model, params, results });
  }
}

export async function runGeminiFlexTasks(args: {
  ai: GoogleGenAI;
  tasks: OcrTask[];
  model: string;
  params: OcrCommandParams;
  results: OcrPdfResult[];
}): Promise<void> {
  for (const task of args.tasks) {
    try {
      args.params.logger.info(`Running Gemini Flex OCR: ${path.relative(process.cwd(), task.pdfPath)}`);
      const text = await flexTask(args.ai, task, args.model, args.params);
      await writeTaskMarkdown({ task, text, results: args.results, backend: 'gemini', mode: 'flex' });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      args.params.logger.error(`OCR failed for ${task.pdfPath}: ${message}`);
      args.results.push({ pdfPath: task.pdfPath, status: 'failed', backend: 'gemini', message, mode: 'flex' });
    }
  }
}

export async function flexTask(ai: GoogleGenAI, task: OcrTask, model: string, params: OcrCommandParams): Promise<string> {
  return flexOcrPdf({
    ai,
    pdfPath: task.pdfPath,
    model,
    serviceTier: params.serviceTier ?? 'flex',
    retries: params.retries ?? 3,
    timeoutMs: params.timeoutMs ?? 900_000,
  });
}
