import { GoogleGenAI } from '@google/genai';
import type { OcrTask } from './plan.js';
import { flexTask } from './geminiRunner.js';
import { runOneLocalTask, writeLocalSuccess, localOptions } from './localRunner.js';
import { localOcrUnavailable } from './preflight.js';
import { writeTaskMarkdown } from './resultWriter.js';
import type { OcrAttempt, OcrCommandParams, OcrPdfResult } from './types.js';

export async function runAutoTasks(tasks: OcrTask[], params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  const unavailable = await localOcrUnavailable(localOptions(params).command);
  if (unavailable) {
    await recoverAllWithoutLocal(tasks, unavailable, params, results);
    return;
  }
  for (const task of tasks) await runAutoTask(task, params, results);
}

async function runAutoTask(task: OcrTask, params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  try {
    const local = await runOneLocalTask(task, params);
    await writeLocalSuccess(task, local, results, [{ backend: 'local', mode: 'local', status: 'written' }]);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    params.logger.warn(`Local OCR failed; trying Gemini Flex recovery: ${task.pdfPath} (${message})`);
    await recoverOne(task, params, results, [{ backend: 'local', mode: 'local', status: 'failed', message }]);
  }
}

async function recoverAllWithoutLocal(tasks: OcrTask[], message: string, params: OcrCommandParams, results: OcrPdfResult[]): Promise<void> {
  params.logger.warn(`Local OCR unavailable: ${message}`);
  for (const task of tasks) {
    await recoverOne(task, params, results, [{ backend: 'local', mode: 'local', status: 'skipped', message }]);
  }
}

async function recoverOne(task: OcrTask, params: OcrCommandParams, results: OcrPdfResult[], attempts: OcrAttempt[]): Promise<void> {
  const apiKey = params.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    results.push({
      pdfPath: task.pdfPath,
      status: 'failed',
      backend: 'auto',
      message: `${attempts.at(-1)?.message ?? 'Local OCR failed'} Gemini recovery was not attempted because no API key is configured.`,
      attempts,
    });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = params.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';
  try {
    const text = await flexTask(ai, task, model, params);
    await writeTaskMarkdown({
      task,
      text,
      results,
      backend: 'gemini',
      mode: 'flex',
      attempts: [...attempts, { backend: 'gemini', mode: 'flex', status: 'written' }],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    params.logger.error(`Gemini recovery failed for ${task.pdfPath}: ${message}`);
    results.push({
      pdfPath: task.pdfPath,
      status: 'failed',
      backend: 'auto',
      message,
      mode: 'flex',
      attempts: [...attempts, { backend: 'gemini', mode: 'flex', status: 'failed', message }],
    });
  }
}
