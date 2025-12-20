import type { Logger } from '../utils/log.js';
import { SessionStore } from '../session/sessionStore.js';
import { scrapeMyCourses } from '../services/courseScraper.js';

export async function listCoursesCommand(params: {
  sessionPath: string;
  headless: boolean;
  format: 'table' | 'json';
  logger: Logger;
}): Promise<void> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) {
    throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);
  }

  const courses = await scrapeMyCourses({ session, headless: params.headless });

  if (params.format === 'json') {
    process.stdout.write(JSON.stringify(courses, null, 2) + '\n');
    return;
  }

  // Minimal table output.
  const rows = courses
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((c) => ({ id: String(c.courseId), title: c.title }));

  const idWidth = Math.max(2, ...rows.map((r) => r.id.length));
  process.stdout.write(`${'ID'.padEnd(idWidth)}  TITLE\n`);
  for (const r of rows) {
    process.stdout.write(`${r.id.padEnd(idWidth)}  ${r.title}\n`);
  }

  params.logger.info(`Found ${rows.length} courses.`);
}
