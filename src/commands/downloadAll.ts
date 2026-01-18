import type { Logger } from '../utils/log.js';
import { SessionStore } from '../session/sessionStore.js';
import { scrapeMyCoursesDetailed } from '../services/courseScraper.js';
import { downloadCommand } from './download.js';

export async function downloadAllCommand(params: {
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
  logger: Logger;
}): Promise<void> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) {
    throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);
  }

  const courses = await scrapeMyCoursesDetailed({ session, headless: params.headless });
  const onDemand = courses.filter((c) => c.isOnDemand);

  if (courses.length === 0) {
    throw new Error('No courses found for this account.');
  }

  if (onDemand.length === 0) {
    const hint = courses
      .slice(0, 10)
      .map((c) => `${c.courseId}:${c.title}${c.sourceTabId ? ` (tab=${c.sourceTabId})` : ''}`)
      .join(', ');
    throw new Error(
      `Could not identify any on-demand courses from the course list UI. Sample: ${hint}\nTry: zenbukko list-courses --format json and share the output so we can adjust detection heuristics.`,
    );
  }

  params.logger.info(`Found ${courses.length} course(s); identified ${onDemand.length} on-demand course(s).`);

  const failures: Array<{ courseId: number; title: string; error: string }> = [];

  for (const course of onDemand) {
    params.logger.info(
      `\n=== Course ${course.courseId}: ${course.title} ===${course.sourceTabId ? ` (tab=${course.sourceTabId})` : ''}`,
    );

    try {
      await downloadCommand({
        sessionPath: params.sessionPath,
        outputDir: params.outputDir,
        courseId: course.courseId,
        maxConcurrency: params.maxConcurrency,
        firstLectureOnly: false,
        transcribe: params.transcribe,
        transcribeModel: params.transcribeModel,
        transcribeFormat: params.transcribeFormat,
        ...(typeof params.transcribeLanguage === 'string' && params.transcribeLanguage.trim()
          ? { transcribeLanguage: params.transcribeLanguage }
          : {}),
        ...(typeof params.noSpeechThreshold === 'number' && Number.isFinite(params.noSpeechThreshold)
          ? { noSpeechThreshold: params.noSpeechThreshold }
          : {}),
        ...(typeof params.maxSeconds === 'number' && Number.isFinite(params.maxSeconds) ? { maxSeconds: params.maxSeconds } : {}),
        materials: params.materials,
        logger: params.logger,
      });
      params.logger.info(`Finished course ${course.courseId}: ${course.title}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ courseId: course.courseId, title: course.title, error: msg });
      params.logger.error(`Failed course ${course.courseId}: ${course.title} (${msg})`);
      // Continue to next course so "download all" is best-effort.
    }
  }

  if (failures.length > 0) {
    const summary = failures.map((f) => `- ${f.courseId} ${f.title}: ${f.error}`).join('\n');
    throw new Error(`Some courses failed:\n${summary}`);
  }

  params.logger.info('All on-demand courses finished.');
}
