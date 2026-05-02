import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer, { type Browser } from 'puppeteer';
import type { MaterialPdfKind } from './types.js';

export async function launchPdfBrowser(): Promise<Browser> {
  const opts: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  return puppeteer.launch(opts);
}

export async function renderSourceToPdf(params: {
  browser: Browser;
  sourcePath: string;
  pdfPath: string;
  kind: Exclude<MaterialPdfKind, 'source-pdf' | 'unsupported'>;
}): Promise<void> {
  const page = await params.browser.newPage();
  try {
    if (params.kind === 'image') {
      await renderImagePdf(page, params.sourcePath, params.pdfPath);
      return;
    }
    await renderDocumentPdf({ page, sourcePath: params.sourcePath, pdfPath: params.pdfPath, kind: params.kind });
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function renderDocumentPdf(params: {
  page: Awaited<ReturnType<Browser['newPage']>>;
  sourcePath: string;
  pdfPath: string;
  kind: 'html' | 'text';
}): Promise<void> {
  await params.page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
  await params.page.emulateMediaType('screen');
  if (params.kind === 'html') await params.page.goto(pathToFileURL(params.sourcePath).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (params.kind === 'text') await params.page.setContent(textHtml(await fs.readFile(params.sourcePath, 'utf8')), { waitUntil: 'load', timeout: 60_000 });
  await params.page.pdf({ path: params.pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
}

async function renderImagePdf(page: Awaited<ReturnType<Browser['newPage']>>, sourcePath: string, pdfPath: string): Promise<void> {
  await page.emulateMediaType('screen');
  await page.setContent(imageHtml(await imageDataUrl(sourcePath)), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const size = boundedImageSize(await naturalImageSize(page));
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
  await page.pdf({
    path: pdfPath,
    width: `${size.width}px`,
    height: `${size.height}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
}

function imageHtml(src: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { width: 100%; height: 100%; margin: 0; background: white; }
img { display: block; width: 100vw; height: 100vh; object-fit: contain; }
</style></head><body><img src="${escapeHtml(src)}" alt=""></body></html>`;
}

async function imageDataUrl(sourcePath: string): Promise<string> {
  const ext = path.extname(sourcePath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const data = await fs.readFile(sourcePath);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

async function naturalImageSize(page: Awaited<ReturnType<Browser['newPage']>>): Promise<{ width: number; height: number }> {
  return page.$eval('img', async (img) => {
    const el = img as { complete: boolean; naturalWidth: number; naturalHeight: number; onload: (() => void) | null; onerror: (() => void) | null };
    if (!el.complete) await new Promise<void>((resolve) => { el.onload = () => resolve(); el.onerror = () => resolve(); });
    return { width: el.naturalWidth || 1280, height: el.naturalHeight || 720 };
  });
}

function boundedImageSize(size: { width: number; height: number }): { width: number; height: number } {
  const scale = Math.min(1, 4096 / Math.max(size.width, size.height));
  return {
    width: Math.max(320, Math.round(size.width * scale)),
    height: Math.max(240, Math.round(size.height * scale)),
  };
}

function textHtml(text: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 16mm; }
body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.45; white-space: pre-wrap; }
</style></head><body>${escapeHtml(text)}</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
