import type { LocalOcrDevice } from '../config.js';
import type { Logger } from '../utils/log.js';
import { SessionStore } from '../session/sessionStore.js';
import { scrapeMyCoursesDetailed } from '../services/courseScraper.js';
import { downloadCommand } from './download.js';

export type DownloadAllCommandParams = {
  sessionPath: string;
  outputDir: string;
  headless: boolean;
  maxConcurrency: number;
  transcribe: boolean;
  transcribeModel: string;
  transcribeFormat: 'txt' | 'srt' | 'vtt';
  transcribeLanguage?: string;
  noSpeechThreshold?: number;
  maxSeconds?: number;
  materials: boolean;
  chapterRange?: string;
  deleteMediaAfterTranscribe: boolean;
  ocrMaterials: boolean;
  ocrForce: boolean;
  ndlocrCommand: string;
  ndlocrDevice: LocalOcrDevice;
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
  logger: Logger;
};

export async function downloadAllCommand(params: DownloadAllCommandParams): Promise<void> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);

  const courses = await scrapeMyCoursesDetailed({ session, headless: params.headless });
  const onDemand = courses.filter((c) => c.isOnDemand);
  if (courses.length === 0) throw new Error('No courses found for this account.');
  if (onDemand.length === 0) throw new Error(onDemandError(courses));

  params.logger.info(`Found ${courses.length} course(s); identified ${onDemand.length} on-demand course(s).`);
  const failures: Array<{ courseId: number; title: string; error: string }> = [];

  for (const course of onDemand) {
    params.logger.info(`\n=== Course ${course.courseId}: ${course.title} ===${course.sourceTabId ? ` (tab=${course.sourceTabId})` : ''}`);
    try {
      await downloadCommand(downloadParamsForCourse(params, course.courseId));
      params.logger.info(`Finished course ${course.courseId}: ${course.title}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ courseId: course.courseId, title: course.title, error: msg });
      params.logger.error(`Failed course ${course.courseId}: ${course.title} (${msg})`);
    }
  }

  if (failures.length > 0) throw new Error(`Some courses failed:\n${failures.map((f) => `- ${f.courseId} ${f.title}: ${f.error}`).join('\n')}`);
  params.logger.info('All on-demand courses finished.');
}

function downloadParamsForCourse(params: DownloadAllCommandParams, courseId: number) {
  return {
    ...params,
    courseId,
    firstLectureOnly: false,
    ...(params.chapterRange ? { chapterRange: params.chapterRange } : {}),
  };
}

function onDemandError(courses: Array<{ courseId: number; title: string; sourceTabId?: string }>): string {
  const hint = courses
    .slice(0, 10)
    .map((c) => `${c.courseId}:${c.title}${c.sourceTabId ? ` (tab=${c.sourceTabId})` : ''}`)
    .join(', ');
  return `Could not identify any on-demand courses from the course list UI. Sample: ${hint}\nTry: zenbukko list-courses --format json and share the output so we can adjust detection heuristics.`;
}
