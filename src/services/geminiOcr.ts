import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI, createPartFromUri } from '@google/genai';
import { readTextFileIfExists } from '../utils/fs.js';
import { discoverPdfFiles } from './geminiOcrDiscovery.js';
import { hasNonEmptyFile, normalizeMarkdown } from './geminiOcrMarkdown.js';

const DEFAULT_PROMPT = [
  'Convert this PDF into clean Markdown.',
  'Preserve headings, lists, tables, code blocks, formulas, and page order when possible.',
  'Do not summarize. Transcribe visible content faithfully.',
  'If a diagram or image contains important text, include that text and a short Markdown note.',
].join('\n');

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export type OcrPdfResult = {
  pdfPath: string;
  markdownPath?: string;
  status: 'written' | 'skipped' | 'failed';
  message?: string;
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
  mode?: 'auto' | 'batch' | 'flex';
  serviceTier?: 'flex' | 'standard';
  retries?: number;
  timeoutMs?: number;
  logger: { info: (message: string) => void; warn: (message: string) => void; error: (message: string) => void };
}): Promise<OcrMaterialsResult> {
  const inputDir = path.resolve(params.inputDir);
  const apiKey = params.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for PDF OCR.');

  const pdfs = await discoverPdfFiles(inputDir);
  if (pdfs.length === 0) {
    params.logger.warn(`No PDF files found for OCR: ${inputDir}`);
  }

  const ai = new GoogleGenAI({ apiKey });
  const results: OcrPdfResult[] = [];

  for (const pdfPath of pdfs) {
    const outPath = pdfPath.replace(/\.pdf$/i, '_ocr.md');
    if (!params.force && (await hasNonEmptyFile(outPath))) {
      params.logger.info(`OCR markdown exists; skipping: ${path.relative(process.cwd(), outPath)}`);
      results.push({ pdfPath, markdownPath: outPath, status: 'skipped', message: 'already exists' });
      continue;
    }

    const size = await fs.stat(pdfPath).then((s) => s.size);
    if (size > MAX_PDF_BYTES) {
      const message = `PDF is larger than ${MAX_PDF_BYTES} bytes; skipping`;
      params.logger.warn(`${message}: ${pdfPath}`);
      results.push({ pdfPath, status: 'skipped', message });
      continue;
    }

    try {
      params.logger.info(`Uploading PDF to Gemini Files API: ${path.relative(process.cwd(), pdfPath)}`);
      const text = await ocrOnePdf({ ai, pdfPath, model: params.model });
      await fs.writeFile(outPath, normalizeMarkdown(text), 'utf8');
      params.logger.info(`OCR markdown written: ${path.relative(process.cwd(), outPath)}`);
      results.push({ pdfPath, markdownPath: outPath, status: 'written' });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      params.logger.error(`OCR failed for ${pdfPath}: ${message}`);
      results.push({ pdfPath, status: 'failed', message });
    }
  }

  const writtenOrExisting = results
    .filter((r) => r.markdownPath && (r.status === 'written' || r.status === 'skipped'))
    .map((r) => r.markdownPath!)
    .sort((a, b) => a.localeCompare(b));

  let aggregatePath: string | undefined;
  if (writtenOrExisting.length > 0) {
    aggregatePath = path.join(inputDir, 'materials_ocr.md');
    const sections: string[] = [];
    for (const mdPath of writtenOrExisting) {
      const body = ((await readTextFileIfExists(mdPath)) ?? '').trim();
      if (!body) continue;
      sections.push(`# ${path.basename(mdPath, '_ocr.md')}\n\n${body}`);
    }
    const aggregate = sections.join('\n\n');
    await fs.writeFile(aggregatePath, aggregate + (aggregate.endsWith('\n') ? '' : '\n'), 'utf8');
    params.logger.info(`OCR aggregate written: ${path.relative(process.cwd(), aggregatePath)}`);
  }

  const manifestPath = path.join(inputDir, 'materials_ocr_manifest.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: params.model,
    inputDir,
    pdfs,
    results,
    aggregatePath,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const output: OcrMaterialsResult = { inputDir, pdfs, results, manifestPath };
  if (aggregatePath) output.aggregatePath = aggregatePath;
  return output;
}

async function ocrOnePdf(params: {
  ai: GoogleGenAI;
  pdfPath: string;
  model: string;
}): Promise<string> {
  const uploaded = await params.ai.files.upload({
    file: params.pdfPath,
    config: {
      mimeType: 'application/pdf',
      displayName: path.basename(params.pdfPath),
    },
  });

  try {
    if (!uploaded.name) throw new Error('Gemini file upload did not return a file name.');

    let current = await params.ai.files.get({ name: uploaded.name });
    for (let i = 0; current.state === 'PROCESSING' && i < 60; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      current = await params.ai.files.get({ name: uploaded.name });
    }

    if (current.state === 'PROCESSING') throw new Error('Gemini file processing timed out.');
    if (current.state === 'FAILED') throw new Error(current.error?.message ?? 'Gemini file processing failed.');
    if (!current.uri || !current.mimeType) throw new Error('Gemini file upload did not return a usable URI.');

    const response = await params.ai.models.generateContent({
      model: params.model,
      contents: [createPartFromUri(current.uri, current.mimeType), { text: DEFAULT_PROMPT }],
    });

    const text = response.text;
    if (!text || !text.trim()) throw new Error('Gemini returned an empty OCR response.');
    return text;
  } finally {
    if (uploaded.name) {
      await params.ai.files.delete({ name: uploaded.name }).catch(() => undefined);
    }
  }
}
