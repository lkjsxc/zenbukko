import fs from 'node:fs/promises';
import path from 'node:path';

export type OcrMode = 'auto' | 'batch' | 'flex';
export type OcrServiceTier = 'flex' | 'standard';

export type OcrTask = {
  pdfPath: string;
  markdownPath: string;
};

export type OcrPlan = {
  mode: 'batch' | 'flex';
  tasks: OcrTask[];
  skipped: OcrTask[];
};

export async function planOcrTasks(params: { pdfs: string[]; force: boolean; mode: OcrMode }): Promise<OcrPlan> {
  const tasks: OcrTask[] = [];
  const skipped: OcrTask[] = [];
  for (const pdfPath of params.pdfs) {
    const task = { pdfPath, markdownPath: pdfPath.replace(/\.pdf$/i, '_ocr.md') };
    if (!params.force && (await hasFreshMarkdown(task.pdfPath, task.markdownPath))) skipped.push(task);
    else tasks.push(task);
  }
  return {
    mode: params.mode === 'batch' || (params.mode === 'auto' && tasks.length > 1) ? 'batch' : 'flex',
    tasks,
    skipped,
  };
}

export function outputName(pdfPath: string): string {
  return path.basename(pdfPath, '.pdf');
}

async function hasFreshMarkdown(pdfPath: string, markdownPath: string): Promise<boolean> {
  const markdown = await fs.stat(markdownPath).catch(() => undefined);
  if (!markdown?.isFile() || markdown.size === 0) return false;
  const pdf = await fs.stat(pdfPath).catch(() => undefined);
  return !pdf?.isFile() || markdown.mtimeMs >= pdf.mtimeMs;
}
