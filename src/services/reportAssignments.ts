import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CourseReportAssignment } from './nnnClient.js';
import { ensureDir } from '../utils/fs.js';
import { fetchWithSafeRedirects } from '../utils/http.js';

export async function downloadReportAssignments(params: {
  assignments: CourseReportAssignment[];
  courseDir: string;
  chapterDirNameForId: (chapterId: number) => string;
  headers: Record<string, string>;
  logger: { info: (message: string) => void; warn: (message: string) => void };
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const byChapter = groupByChapter(params.assignments);
  const written: string[] = [];
  for (const [chapterId, assignments] of byChapter) {
    const sections = await captureChapterAssignments(assignments, params);
    if (sections.length === 0) continue;
    const chapterDir = path.join(params.courseDir, params.chapterDirNameForId(chapterId));
    await ensureDir(chapterDir);
    const outputPath = path.join(chapterDir, `chapter-${chapterId}_report_assignments.md`);
    await fs.writeFile(outputPath, `${sections.join('\n\n')}\n`, 'utf8');
    params.logger.info(`Wrote chapter report assignments: ${path.relative(process.cwd(), outputPath)}`);
    written.push(outputPath);
  }
  return written;
}

async function captureChapterAssignments(
  assignments: CourseReportAssignment[],
  params: Parameters<typeof downloadReportAssignments>[0],
): Promise<string[]> {
  const sections: string[] = [];
  for (const [index, assignment] of assignments.entries()) {
    try {
      const text = await fetchAssignmentText(assignment.contentUrl, params.headers, params.fetchImpl);
      if (!text) {
        params.logger.warn(`Report assignment page was empty: ${assignment.contentUrl}`);
        continue;
      }
      sections.push(renderAssignment(index + 1, assignment, text));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      params.logger.warn(`Report assignment fetch failed: ${assignment.contentUrl} (${reason})`);
    }
  }
  return sections;
}

async function fetchAssignmentText(contentUrl: string, headers: Record<string, string>, fetchImpl?: typeof fetch): Promise<string> {
  const url = new URL(contentUrl);
  const response = await fetchWithSafeRedirects(url, { headers, authenticatedOrigin: url, ...(fetchImpl ? { fetchImpl } : {}) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return readableText(await response.text());
}

function readableText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, canvas, template').remove();
  const text = $('main').text() || $('article').text() || $('body').text();
  return text.replaceAll(/\s+/g, ' ').trim();
}

function renderAssignment(index: number, assignment: CourseReportAssignment, text: string): string {
  const title = assignment.title?.replaceAll(/\s+/g, ' ').trim() || `report-assignment-${assignment.assignmentId}`;
  return `## ${String(index).padStart(2, '0')} ${title}\n\nSource URL: <${assignment.contentUrl}>\n\n${text}`;
}

function groupByChapter(assignments: CourseReportAssignment[]): Map<number, CourseReportAssignment[]> {
  const byChapter = new Map<number, CourseReportAssignment[]>();
  for (const assignment of assignments) {
    const entries = byChapter.get(assignment.chapterId) ?? [];
    entries.push(assignment);
    byChapter.set(assignment.chapterId, entries);
  }
  return byChapter;
}
