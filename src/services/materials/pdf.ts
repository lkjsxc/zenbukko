import path from 'node:path';
import type { Browser } from 'puppeteer';
import { ensureDir, fileExists } from '../../utils/fs.js';
import { classifyMaterialForPdf, generatedPdfRelativePath, supportedPdfKind } from './pdfPlan.js';
import { launchPdfBrowser, renderSourceToPdf } from './pdfRender.js';
import type { MaterialAsset, MaterialPdfEntry, MaterialReferencePage, MaterialsManifest } from './types.js';

type Logger = { info: (message: string) => void; warn: (message: string) => void };
type PdfBackedItem = MaterialReferencePage | MaterialAsset;

export async function normalizeMaterialsToPdfs(params: { outDir: string; manifest: MaterialsManifest; logger: Logger }): Promise<void> {
  await ensureDir(path.join(params.outDir, 'pdf'));
  const entries: MaterialPdfEntry[] = [];
  let browser: Browser | undefined;
  try {
    for (const page of params.manifest.referencePages) {
      const result = await normalizeOne({ outDir: params.outDir, item: page, logger: params.logger, browser });
      browser = result.browser;
      if (result.entry) entries.push(result.entry);
    }
    for (const asset of params.manifest.assets) {
      const result = await normalizeOne({ outDir: params.outDir, item: asset, logger: params.logger, browser });
      browser = result.browser;
      if (result.entry) entries.push(result.entry);
    }
  } finally {
    await browser?.close().catch(() => undefined);
  }
  params.manifest.pdfs = dedupeReadyEntries(entries);
}

async function normalizeOne(params: {
  outDir: string;
  item: PdfBackedItem;
  logger: Logger;
  browser: Browser | undefined;
}): Promise<{ browser: Browser | undefined; entry?: MaterialPdfEntry }> {
  const kind = classifyMaterialForPdf(params.item.file);
  if (kind === 'unsupported') {
    markSkipped(params.item, 'unsupported material type');
    return { browser: params.browser };
  }

  const sourcePath = path.resolve(params.outDir, params.item.file);
  if (!(await fileExists(sourcePath))) {
    markFailed(params.item, 'source file is missing');
    return { browser: params.browser, entry: failedEntry(params.item.file, params.item.file, kind, 'source file is missing') };
  }

  if (kind === 'source-pdf') {
    markReady(params.item, params.item.file, false, 'ready');
    return { browser: params.browser, entry: { sourceFile: params.item.file, pdfFile: params.item.file, kind, status: 'ready' } };
  }

  const pdfFile = generatedPdfRelativePath(params.item.file);
  const pdfPath = path.resolve(params.outDir, pdfFile);
  let activeBrowser = params.browser;
  try {
    await ensureDir(path.dirname(pdfPath));
    activeBrowser = activeBrowser ?? (await launchPdfBrowser());
    await renderSourceToPdf({ browser: activeBrowser, sourcePath, pdfPath, kind });
    if (!(await fileExists(pdfPath))) throw new Error('PDF was not written');
    markReady(params.item, pdfFile, true, 'converted');
    params.logger.info(`Material PDF written: ${path.relative(process.cwd(), pdfPath)}`);
    return { browser: activeBrowser, entry: { sourceFile: params.item.file, pdfFile, kind, status: 'ready' } };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    markFailed(params.item, message);
    params.logger.warn(`Material PDF conversion failed: ${params.item.file} (${message})`);
    return { browser: activeBrowser, entry: failedEntry(params.item.file, pdfFile, kind, message) };
  }
}

function markReady(item: PdfBackedItem, pdfFile: string, generated: boolean, status: 'converted' | 'ready'): void {
  item.pdfFile = pdfFile;
  item.pdfGenerated = generated;
  item.ocrEligible = true;
  item.conversionStatus = status;
  delete item.conversionMessage;
}

function markSkipped(item: PdfBackedItem, message: string): void {
  item.ocrEligible = false;
  item.conversionStatus = 'skipped';
  item.conversionMessage = message;
}

function markFailed(item: PdfBackedItem, message: string): void {
  item.ocrEligible = false;
  item.conversionStatus = 'failed';
  item.conversionMessage = message;
}

function failedEntry(sourceFile: string, pdfFile: string, kind: Exclude<ReturnType<typeof classifyMaterialForPdf>, 'unsupported'>, message: string): MaterialPdfEntry {
  return { sourceFile, pdfFile, kind, status: 'failed', message };
}

function dedupeReadyEntries(entries: MaterialPdfEntry[]): MaterialPdfEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (!supportedPdfKind(entry.kind)) return false;
    if (entry.status !== 'ready') return true;
    if (seen.has(entry.pdfFile)) return false;
    seen.add(entry.pdfFile);
    return true;
  });
}
