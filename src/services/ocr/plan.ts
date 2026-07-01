import fs from 'node:fs/promises';

export type OcrTask = {
  pdfPath: string;
  markdownPath: string;
};

export type OcrPlan = {
  tasks: OcrTask[];
  skipped: OcrTask[];
};

export async function planOcrTasks(params: { pdfs: string[]; force: boolean }): Promise<OcrPlan> {
  const tasks: OcrTask[] = [];
  const skipped: OcrTask[] = [];
  for (const pdfPath of params.pdfs) {
    const task = { pdfPath, markdownPath: pdfPath.replace(/\.pdf$/i, '_ocr.md') };
    if (!params.force && (await hasFreshMarkdown(task.pdfPath, task.markdownPath))) skipped.push(task);
    else tasks.push(task);
  }
  return { tasks, skipped };
}

async function hasFreshMarkdown(pdfPath: string, markdownPath: string): Promise<boolean> {
  const markdown = await fs.stat(markdownPath).catch(() => undefined);
  if (!markdown?.isFile() || markdown.size === 0) return false;
  const pdf = await fs.stat(pdfPath).catch(() => undefined);
  return !pdf?.isFile() || markdown.mtimeMs >= pdf.mtimeMs;
}
