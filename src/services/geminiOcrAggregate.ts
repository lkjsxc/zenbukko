import fs from 'node:fs/promises';
import path from 'node:path';
import { readTextFileIfExists } from '../utils/fs.js';
import type { OcrPdfResult } from './geminiOcr.js';

export async function writeAggregate(inputDir: string, results: OcrPdfResult[], logger: { info: (message: string) => void }): Promise<string | undefined> {
  const paths = results.filter((r) => r.markdownPath && (r.status === 'written' || r.status === 'skipped')).map((r) => r.markdownPath!);
  if (paths.length === 0) return undefined;
  const sections = [];
  for (const mdPath of paths) {
    const body = ((await readTextFileIfExists(mdPath)) ?? '').trim();
    if (body) sections.push(normalizeAggregateSection(body));
  }
  const aggregatePath = path.join(inputDir, 'materials_ocr.md');
  const aggregate = [`# ${aggregateTitle(inputDir)}`, ...sections].join('\n\n');
  await fs.writeFile(aggregatePath, aggregate + (aggregate.endsWith('\n') ? '' : '\n'), 'utf8');
  logger.info(`OCR aggregate written: ${path.relative(process.cwd(), aggregatePath)}`);
  return aggregatePath;
}

function normalizeAggregateSection(markdown: string): string {
  const lines = markdown.trim().split('\n');
  const normalized = lines.map((line) => line.replace(/^#(#{0,5})\s+/, '##$1 '));
  return collapseAdjacentDuplicateHeadings(normalized).join('\n').trim();
}

function collapseAdjacentDuplicateHeadings(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const current = headingText(line);
    const previous = headingText(out.at(-1) ?? '');
    if (current && previous && current === previous) continue;
    out.push(line);
  }
  return out;
}

function headingText(line: string): string | undefined {
  return line.match(/^#{2,6}\s+(.+)$/)?.[1]?.trim();
}

function aggregateTitle(inputDir: string): string {
  const base = path.basename(inputDir).replace(/[_-]+materials$/i, '').replaceAll('_', ' ').trim();
  return base || 'Materials OCR';
}
