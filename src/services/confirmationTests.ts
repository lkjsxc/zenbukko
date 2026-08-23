import path from 'node:path';
import type { CourseConfirmationTest } from './nnnClient.js';
import { ensureDir } from '../utils/fs.js';
import { fetchWithSafeRedirects } from '../utils/http.js';
import { writeJsonAtomic } from '../utils/atomic.js';
import { parseConfirmationTestPage } from './confirmationTestParser.js';
import type { CaptureFailure, CapturedConfirmationTest } from './confirmationTestsTypes.js';

export type { CapturedConfirmationTest } from './confirmationTestsTypes.js';
export { parseConfirmationTestPage } from './confirmationTestParser.js';

export async function downloadConfirmationTests(params: {
  tests: CourseConfirmationTest[];
  courseDir: string;
  chapterDirNameForId: (chapterId: number) => string;
  headers: Record<string, string>;
  logger: { info: (message: string) => void; warn: (message: string) => void };
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const written: string[] = [];
  for (const [chapterId, tests] of groupByChapter(params.tests)) {
    const captured: CapturedConfirmationTest[] = [];
    const failures: CaptureFailure[] = [];
    for (const test of tests) {
      try {
        captured.push(await fetchConfirmationTest(test, params.headers, params.fetchImpl));
      } catch (error) {
        const failure = captureFailure(test, error);
        failures.push(failure);
        params.logger.warn(`Confirmation test capture failed: ${test.contentUrl ?? `section ${test.testId}`} (${failure.message})`);
      }
    }
    const chapterDir = path.join(params.courseDir, params.chapterDirNameForId(chapterId));
    await ensureDir(chapterDir);
    const outputPath = path.join(chapterDir, `chapter-${chapterId}_confirmation_tests.json`);
    await writeJsonAtomic(outputPath, { generatedAt: new Date().toISOString(), chapterId, tests: captured, failures });
    params.logger.info(
      `Wrote chapter confirmation tests (${captured.length} captured, ${failures.length} failed): ${path.relative(process.cwd(), outputPath)}`,
    );
    written.push(outputPath);
  }
  return written;
}

async function fetchConfirmationTest(
  test: CourseConfirmationTest,
  headers: Record<string, string>,
  fetchImpl?: typeof fetch,
): Promise<CapturedConfirmationTest> {
  if (!test.contentUrl) throw new Error('content URL is missing');
  const url = confirmationTestUrl(test.contentUrl);
  const response = await fetchWithSafeRedirects(url, { headers, authenticatedOrigin: url, ...(fetchImpl ? { fetchImpl } : {}) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseConfirmationTestPage({ ...test, contentUrl: test.contentUrl }, await response.text());
}

function confirmationTestUrl(value: string): URL {
  const url = new URL(value);
  const nnnHost = url.hostname === 'nnn.ed.nico' || url.hostname.endsWith('.nnn.ed.nico');
  if (url.protocol !== 'https:' || !nnnHost || url.username || url.password) {
    throw new Error('content URL must be an HTTPS URL on nnn.ed.nico');
  }
  return url;
}

function groupByChapter(tests: CourseConfirmationTest[]): Map<number, CourseConfirmationTest[]> {
  const grouped = new Map<number, CourseConfirmationTest[]>();
  for (const test of tests) grouped.set(test.chapterId, [...(grouped.get(test.chapterId) ?? []), test]);
  return grouped;
}

function captureFailure(test: CourseConfirmationTest, error: unknown): CaptureFailure {
  return {
    id: test.testId,
    ...(test.title ? { title: test.title } : {}),
    ...(test.contentUrl ? { sourceUrl: test.contentUrl } : {}),
    message: error instanceof Error ? error.message : String(error),
  };
}
