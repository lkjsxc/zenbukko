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

export function normalizeAggregateSection(markdown: string): string {
  const lines = markdown.trim().split('\n');
  const shift = headingShift(lines);
  const normalized = lines.map((line) => normalizeHeading(line, shift));
  return collapseAdjacentDuplicateHeadings(normalized).join('\n').trim();
}

function headingShift(lines: string[]): number {
  const levels = lines.map((line) => headingLevel(line)).filter((level): level is number => Boolean(level));
  const minLevel = Math.min(...levels.filter((level) => level > 1));
  return Number.isFinite(minLevel) && minLevel > 2 ? minLevel - 2 : 0;
}

function normalizeHeading(line: string, shift: number): string {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return line;
  const hashes = match[1] ?? '';
  const text = match[2] ?? '';
  const level = Math.max(2, Math.min(6, hashes.length - shift));
  return `${'#'.repeat(level)} ${text.trim()}`;
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

function headingLevel(line: string): number | undefined {
  return line.match(/^(#{1,6})\s+/)?.[1]?.length;
}

function aggregateTitle(inputDir: string): string {
  const base = path.basename(inputDir).replace(/[_-]+materials$/i, '').replaceAll('_', ' ').trim();
  return base || 'Materials OCR';
}
