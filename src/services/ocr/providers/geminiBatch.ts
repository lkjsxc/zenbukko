import path from 'node:path';
import { createPartFromUri, type GoogleGenAI } from '@google/genai';
import type { OcrTask } from '../plan.js';
import { DEFAULT_PROMPT, waitForFile } from './geminiFlex.js';

export type BatchOcrOutput = {
  batchJobName?: string;
  texts: Map<string, string>;
  errors: Map<string, string>;
};

export async function batchOcrPdfs(params: { ai: GoogleGenAI; tasks: OcrTask[]; model: string; timeoutMs: number }): Promise<BatchOcrOutput> {
  const uploads = [];
  for (const task of params.tasks) {
    const uploaded = await params.ai.files.upload({
      file: task.pdfPath,
      config: { mimeType: 'application/pdf', displayName: path.basename(task.pdfPath) },
    });
    uploads.push({ task, file: await waitForFile(params.ai, uploaded.name), uploadName: uploaded.name });
  }

  try {
    const src = uploads.map((u) => ({
      contents: [createPartFromUri(u.file.uri ?? '', u.file.mimeType ?? 'application/pdf'), { text: DEFAULT_PROMPT }],
      metadata: { pdfPath: u.task.pdfPath },
    }));
    let job = await params.ai.batches.create({
      model: params.model,
      src,
      config: { displayName: `zenbukko-ocr-${Date.now()}`, httpOptions: { timeout: params.timeoutMs } },
    });
    while (job.state === 'JOB_STATE_QUEUED' || job.state === 'JOB_STATE_PENDING' || job.state === 'JOB_STATE_RUNNING') {
      await sleep(10_000);
      if (!job.name) break;
      job = await params.ai.batches.get({ name: job.name });
    }

    const output: BatchOcrOutput = { texts: new Map(), errors: new Map() };
    if (job.name) output.batchJobName = job.name;
    if (job.state !== 'JOB_STATE_SUCCEEDED') {
      const message = job.error?.message ?? `Batch job ended in state ${String(job.state)}`;
      for (const task of params.tasks) output.errors.set(task.pdfPath, message);
      return output;
    }
    for (const response of job.dest?.inlinedResponses ?? []) {
      const pdfPath = response.metadata?.pdfPath;
      if (!pdfPath) continue;
      if (response.response?.text) output.texts.set(pdfPath, response.response.text);
      else output.errors.set(pdfPath, response.error?.message ?? 'Batch item returned no text.');
    }
    return output;
  } finally {
    await Promise.all(uploads.map((u) => (u.uploadName ? params.ai.files.delete({ name: u.uploadName }).catch(() => undefined) : undefined)));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
