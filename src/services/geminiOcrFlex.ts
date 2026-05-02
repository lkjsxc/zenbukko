import path from 'node:path';
import { ServiceTier, createPartFromUri, type GoogleGenAI } from '@google/genai';
import type { OcrServiceTier } from './geminiOcrPlan.js';

const DEFAULT_PROMPT = [
  'Convert this PDF into clean Markdown.',
  'Preserve headings, lists, tables, code blocks, formulas, and page order when possible.',
  'Do not summarize. Transcribe visible content faithfully.',
  'If a diagram or image contains important text, include that text and a short Markdown note.',
].join('\n');

export async function flexOcrPdf(params: {
  ai: GoogleGenAI;
  pdfPath: string;
  model: string;
  serviceTier: OcrServiceTier;
  retries: number;
  timeoutMs: number;
}): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt <= params.retries; attempt += 1) {
    try {
      return await ocrOnce(params);
    } catch (e) {
      last = e;
      if (attempt >= params.retries || !isRetryable(e)) break;
      await sleep(Math.min(60_000, 5_000 * 2 ** attempt));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

async function ocrOnce(params: {
  ai: GoogleGenAI;
  pdfPath: string;
  model: string;
  serviceTier: OcrServiceTier;
  timeoutMs: number;
}): Promise<string> {
  const uploaded = await params.ai.files.upload({
    file: params.pdfPath,
    config: { mimeType: 'application/pdf', displayName: path.basename(params.pdfPath) },
  });
  try {
    const file = await waitForFile(params.ai, uploaded.name);
    if (!file.uri || !file.mimeType) throw new Error('Gemini file upload did not return a usable URI.');
    const response = await params.ai.models.generateContent({
      model: params.model,
      contents: [createPartFromUri(file.uri, file.mimeType), { text: DEFAULT_PROMPT }],
      config: {
        serviceTier: params.serviceTier === 'flex' ? ServiceTier.FLEX : ServiceTier.STANDARD,
        httpOptions: { timeout: params.timeoutMs },
      },
    });
    if (!response.text?.trim()) throw new Error('Gemini returned an empty OCR response.');
    return response.text;
  } finally {
    if (uploaded.name) await params.ai.files.delete({ name: uploaded.name }).catch(() => undefined);
  }
}

export async function waitForFile(ai: GoogleGenAI, name: string | undefined) {
  if (!name) throw new Error('Gemini file upload did not return a file name.');
  let current = await ai.files.get({ name });
  for (let i = 0; current.state === 'PROCESSING' && i < 90; i += 1) {
    await sleep(2_000);
    current = await ai.files.get({ name });
  }
  if (current.state === 'PROCESSING') throw new Error('Gemini file processing timed out.');
  if (current.state === 'FAILED') throw new Error(current.error?.message ?? 'Gemini file processing failed.');
  return current;
}

function isRetryable(e: unknown): boolean {
  const text = e instanceof Error ? e.message : String(e);
  return /\b(429|503|RESOURCE_EXHAUSTED|UNAVAILABLE)\b/i.test(text);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_PROMPT };
