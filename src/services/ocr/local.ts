import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { LocalOcrDevice, OcrDiagnosticCode } from './types.js';
import type { OcrTask } from './plan.js';
import { normalizeMarkdown } from './text.js';

export class LocalOcrError extends Error {
  constructor(readonly diagnosticCode: OcrDiagnosticCode, message: string) {
    super(message);
  }
}

export type LocalOcrOutput = {
  markdown: string;
  artifactDir?: string;
  pageCount: number;
  emptyPageCount: number;
  elapsedMs: number;
  rawOutputPaths?: string[];
};

export async function runLocalOcrTask(params: {
  task: OcrTask;
  command: string;
  device: LocalOcrDevice;
  pageDpi: number;
  keepIntermediates: boolean;
  enableTcy: boolean;
}): Promise<LocalOcrOutput> {
  const started = Date.now();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-ocr-'));
  const imageDir = path.join(workDir, 'pages');
  const outDir = path.join(workDir, 'out');
  await fs.mkdir(imageDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });
  try {
    await rasterizePdf(params.task.pdfPath, imageDir, params.pageDpi);
    await runNdlocr(params.command, imageDir, outDir, params.device, params.enableTcy);
    const pages = await collectPageText(outDir);
    const markdown = normalizeMarkdown(toMarkdown(path.basename(params.task.pdfPath), pages.nonEmpty));
    return outputFromPages(markdown, pages, workDir, Date.now() - started, params.keepIntermediates);
  } finally {
    if (!params.keepIntermediates) await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function rasterizePdf(pdfPath: string, imageDir: string, pageDpi: number): Promise<void> {
  const prefix = path.join(imageDir, 'page');
  await runCommand('pdftoppm', ['-r', String(pageDpi), '-png', pdfPath, prefix], 'pdf-rasterize-failed');
}

async function runNdlocr(command: string, imageDir: string, outDir: string, device: LocalOcrDevice, enableTcy: boolean): Promise<void> {
  const args = ['--sourcedir', imageDir, '--output', outDir, '--device', device];
  if (enableTcy) args.push('--enable-tcy');
  try {
    await runCommand(command, args, 'ocr-command-failed');
  } catch (e) {
    if (!enableTcy) throw e;
    await runCommand(command, args.filter((arg) => arg !== '--enable-tcy'), 'ocr-command-failed');
  }
}

async function collectPageText(outDir: string): Promise<{ total: number; empty: number; files: string[]; nonEmpty: Array<{ name: string; text: string }> }> {
  const files = (await walk(outDir)).filter((file) => file.toLowerCase().endsWith('.txt')).sort(comparePageFiles);
  const nonEmpty = [];
  let empty = 0;
  for (const file of files) {
    const text = (await fs.readFile(file, 'utf8')).trim();
    if (text) nonEmpty.push({ name: path.basename(file, '.txt'), text });
    else empty += 1;
  }
  if (nonEmpty.length === 0) {
    throw new LocalOcrError('ocr-produced-empty-output', 'Local OCR produced no non-empty text output.');
  }
  return { total: files.length, empty, files, nonEmpty };
}

function outputFromPages(markdown: string, pages: Awaited<ReturnType<typeof collectPageText>>, workDir: string, elapsedMs: number, keep: boolean): LocalOcrOutput {
  return {
    markdown,
    pageCount: pages.total,
    emptyPageCount: pages.empty,
    elapsedMs,
    ...(keep ? { artifactDir: workDir, rawOutputPaths: pages.files } : {}),
  };
}

function toMarkdown(pdfName: string, pages: Array<{ name: string; text: string }>): string {
  const sections = [`## ${pdfName}`];
  for (let i = 0; i < pages.length; i += 1) sections.push(`### Page ${i + 1}`, pages[i]!.text);
  return sections.join('\n\n');
}

async function walk(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function comparePageFiles(a: string, b: string): number {
  return path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true });
}

async function runCommand(cmd: string, args: string[], code: OcrDiagnosticCode): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stderr: Buffer[] = [];
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (e) => reject(new LocalOcrError(code, `${cmd} failed to start: ${e.message}`)));
    child.on('close', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new LocalOcrError(code, `${cmd} exited with code ${exitCode}: ${bounded(Buffer.concat(stderr).toString('utf8'))}`));
    });
  });
}

function bounded(value: string): string {
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean.length > 500 ? `${clean.slice(0, 497)}...` : clean;
}
