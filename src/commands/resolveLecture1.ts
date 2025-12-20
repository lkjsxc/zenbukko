import type { Logger } from '../utils/log.js';
import { SessionStore } from '../session/sessionStore.js';
import { scrapeMyCourses } from '../services/courseScraper.js';
import { NnnClient } from '../services/nnnClient.js';

export async function resolveLecture1Command(params: {
  sessionPath: string;
  headless: boolean;
  courseId?: number;
  courseQuery?: string;
  logger: Logger;
}): Promise<void> {
  const session = await new SessionStore(params.sessionPath).load();
  if (!session) {
    throw new Error(`No session found at ${params.sessionPath}. Run: zenbukko auth`);
  }

  let courseId = params.courseId;

  if (!courseId) {
    const q = params.courseQuery?.trim();
    if (!q) {
      throw new Error('Provide either --course-id or --course-query');
    }

    params.logger.info('Searching courses via browser…');
    const courses = await scrapeMyCourses({ session, headless: params.headless });
    const found = courses.find((c) => c.title.toLowerCase().includes(q.toLowerCase()));
    if (!found) {
      throw new Error(`No course found matching query: ${q}`);
    }

    courseId = found.courseId;
    params.logger.info(`Matched course: ${found.title} (${courseId})`);
  }

  const client = new NnnClient(session);
  const lecture = await client.resolveFirstLecture(courseId);

  process.stdout.write(JSON.stringify(lecture, null, 2) + '\n');
  params.logger.info('The `videoUrl` is the download-ready HLS (.m3u8) URL.');
}
