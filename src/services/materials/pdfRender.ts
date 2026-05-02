import fs from 'node:fs/promises';
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
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
    await page.emulateMediaType('screen');
    if (params.kind === 'html') await page.goto(pathToFileURL(params.sourcePath).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (params.kind === 'image') await page.setContent(imageHtml(pathToFileURL(params.sourcePath).toString()), { waitUntil: 'load', timeout: 60_000 });
    if (params.kind === 'text') await page.setContent(textHtml(await fs.readFile(params.sourcePath, 'utf8')), { waitUntil: 'load', timeout: 60_000 });
    await page.pdf({ path: params.pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close().catch(() => undefined);
  }
}

function imageHtml(src: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 16mm; }
body { margin: 0; font-family: sans-serif; }
img { display: block; max-width: 100%; max-height: 265mm; margin: 0 auto; object-fit: contain; }
</style></head><body><img src="${escapeHtml(src)}" alt=""></body></html>`;
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
