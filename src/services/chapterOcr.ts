import fs from 'node:fs/promises';
import path from 'node:path';
import { readTextFileIfExists } from '../utils/fs.js';

type Logger = { info: (message: string) => void; warn: (message: string) => void };

type ChapterOcrSource = {
  chapterDir: string;
  chapterId: number;
  lessonIndex: number;
  lessonLabel: string;
  markdownPath: string;
};

export type ChapterOcrRebuildResult = {
  written: string[];
  skipped: number;
};

export async function rebuildChapterOcr(params: { inputDir: string; logger: Logger }): Promise<ChapterOcrRebuildResult> {
  const inputDir = path.resolve(params.inputDir);
  const markdownFiles = await discoverFiles(inputDir, 'materials_ocr.md');
  const sources = await resolveSources(markdownFiles, params.logger);
  const byChapter = groupByChapter(sources);
  const written: string[] = [];
  let skipped = markdownFiles.length - sources.length;
  for (const sourcesForChapter of byChapter.values()) {
    const outPath = await writeOneChapter(sourcesForChapter, params.logger);
    if (outPath) written.push(outPath);
    else skipped += sourcesForChapter.length;
  }
  params.logger.info(`Chapter OCR rebuild finished: ${written.length} chapter file(s) written.`);
  return { written, skipped };
}

async function resolveSources(files: string[], logger: Logger): Promise<ChapterOcrSource[]> {
  const sources: ChapterOcrSource[] = [];
  for (const markdownPath of files) {
    const materialDir = path.dirname(markdownPath);
    const lessonDir = path.dirname(materialDir);
    const chapterDir = path.dirname(lessonDir);
    const chapterId = await inferChapterId(materialDir, chapterDir);
    const lessonIndex = Number(path.basename(lessonDir));
    const lessonId = inferLessonId(materialDir);
    if (!chapterId || !Number.isFinite(lessonIndex)) {
      logger.warn(`Skipping OCR aggregate outside chapter layout: ${markdownPath}`);
      continue;
    }
    sources.push({ chapterDir, chapterId, lessonIndex, lessonLabel: `lesson-${lessonId ?? path.basename(materialDir)}`, markdownPath });
  }
  return sources.sort(compareSources);
}

async function writeOneChapter(sources: ChapterOcrSource[], logger: Logger): Promise<string | undefined> {
  const sections: string[] = [];
  for (const [lessonIndex, lessonSources] of groupByLesson(sources)) {
    const bodies = await Promise.all(lessonSources.map((source) => normalizedLessonBody(source.markdownPath)));
    const body = bodies.filter(Boolean).join('\n\n').trim();
    if (!body) {
      logger.warn(`Skipping empty chapter OCR lesson section: ${lessonSources[0]?.markdownPath ?? lessonIndex}`);
      continue;
    }
    const label = lessonSources[0]?.lessonLabel ?? `lesson-${lessonIndex}`;
    sections.push(`## ${String(lessonIndex).padStart(2, '0')} ${label}\n\n${body}`.trimEnd());
  }
  if (sections.length === 0) return undefined;
  const first = sources[0]!;
  const outPath = path.join(first.chapterDir, `chapter-${first.chapterId}_ocr.md`);
  const markdown = sections.join('\n\n');
  await fs.writeFile(outPath, markdown + (markdown.endsWith('\n') ? '' : '\n'), 'utf8');
  logger.info(`Wrote chapter OCR markdown: ${path.relative(process.cwd(), outPath)}`);
  return outPath;
}

async function normalizedLessonBody(markdownPath: string): Promise<string> {
  const raw = ((await readTextFileIfExists(markdownPath)) ?? '').trim();
  if (!raw) return '';
  const lines = dropLeadingH1(raw.split('\n'));
  return collapseAdjacentDuplicateHeadings(lines.map(demoteHeading)).join('\n').trim();
}

function dropLeadingH1(lines: string[]): string[] {
  const firstContent = lines.findIndex((line) => line.trim());
  if (firstContent < 0 || !/^#\s+/.test(lines[firstContent]!)) return lines;
  return lines.slice(firstContent + 1).filter((line, index) => index > 0 || line.trim());
}

function demoteHeading(line: string): string {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return line;
  const level = Math.max(3, Math.min(6, (match[1]?.length ?? 1) + 1));
  return `${'#'.repeat(level)} ${match[2]?.trim() ?? ''}`;
}

function collapseAdjacentDuplicateHeadings(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const current = line.match(/^#{3,6}\s+(.+)$/)?.[1]?.trim();
    const previous = out.at(-1)?.match(/^#{3,6}\s+(.+)$/)?.[1]?.trim();
    if (current && previous && current === previous) continue;
    out.push(line);
  }
  return out;
}

function groupByChapter(sources: ChapterOcrSource[]): Map<string, ChapterOcrSource[]> {
  const groups = new Map<string, ChapterOcrSource[]>();
  for (const source of sources) {
    const key = `${source.chapterDir}:${source.chapterId}`;
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  return groups;
}

function groupByLesson(sources: ChapterOcrSource[]): Map<number, ChapterOcrSource[]> {
  const groups = new Map<number, ChapterOcrSource[]>();
  for (const source of sources) groups.set(source.lessonIndex, [...(groups.get(source.lessonIndex) ?? []), source]);
  return groups;
}

function compareSources(a: ChapterOcrSource, b: ChapterOcrSource): number {
  return a.chapterDir.localeCompare(b.chapterDir) || a.lessonIndex - b.lessonIndex || a.markdownPath.localeCompare(b.markdownPath);
}

async function inferChapterId(materialDir: string, chapterDir: string): Promise<number | undefined> {
  return (await chapterIdFromManifest(materialDir)) ?? (await chapterIdFromTranscript(chapterDir));
}

async function chapterIdFromManifest(materialDir: string): Promise<number | undefined> {
  const raw = await readTextFileIfExists(path.join(materialDir, 'materials_manifest.json'));
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { referencePages?: Array<{ url?: string }> };
    for (const page of parsed.referencePages ?? []) {
      const id = page.url?.match(/\/chapters\/(\d+)(?:\/|$)/)?.[1];
      if (id) return Number(id);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function chapterIdFromTranscript(chapterDir: string): Promise<number | undefined> {
  const entries = await fs.readdir(chapterDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const id = entry.isFile() ? entry.name.match(/^chapter-(\d+)_transcription\.md$/)?.[1] : undefined;
    if (id) return Number(id);
  }
  return undefined;
}

function inferLessonId(materialDir: string): string | undefined {
  return path.basename(materialDir).match(/^lesson-(\d+)/)?.[1];
}

async function discoverFiles(root: string, name: string): Promise<string[]> {
  const out: string[] = [];
  await walk(root, name, out);
  return out.sort((a, b) => a.localeCompare(b));
}

async function walk(dir: string, name: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      await walk(p, name, out);
    } else if (entry.isFile() && entry.name === name) {
      out.push(p);
    }
  }
}
