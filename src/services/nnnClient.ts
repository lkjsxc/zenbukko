import { buildCookieHeader, type StoredSession } from '../session/sessionStore.js';
import { fetchJsonWithRetry } from './http.js';
import {
  parseChapterDetails,
  parseCourseDetails,
  parseLessonV1,
  parseMovieV2,
  type NormalizedChapterDetails,
  type NormalizedCourseDetails,
  type NormalizedLessonV1,
  type NormalizedMovieV2,
} from './nnnSchemas.js';
import { resolveCourseLessonsForClient, resolveFirstLectureForClient } from './nnnResolver.js';

export type ResolvedLecture = {
  courseId: number;
  chapterId: number;
  lessonId: number;
  courseTitle?: string;
  chapterTitle?: string;
  lessonTitle?: string;
  videoUrl: string; // HLS .m3u8
  referencePageUrls?: string[];
};

export type CourseChapter = {
  id: number;
  title?: string;
  order?: number;
};

export type CourseLesson = {
  chapterId: number;
  chapterTitle?: string;
  lessonId: number;
  lessonTitle?: string;
  videoUrl: string;
  referencePageUrls?: string[];
  videoItems?: Array<{
    index: number;
    title?: string;
    videoUrl: string;
    referencePageUrls?: string[];
  }>;
};

export type CourseStructure = {
  courseId: number;
  courseTitle?: string;
  chapters: CourseChapter[];
  lessons: CourseLesson[];
  skippedLessons?: Array<{ chapterId: number; lessonId: number; reason: string }>;
};

export class NnnClient {
  private readonly apiV2Base = new URL('https://api.nnn.ed.nico/v2/');

  public constructor(private readonly session: StoredSession) {}

  private headersFor(url: URL): Headers {
    const cookie = buildCookieHeader(this.session, url);
    const headers = new Headers({
      accept: 'application/json, text/plain, */*',
      'user-agent': this.session.userAgent ?? 'zenbukko/2.0',
    });
    if (cookie) headers.set('cookie', cookie);
    return headers;
  }

  async getCourseDetails(courseId: number): Promise<NormalizedCourseDetails> {
    const url = new URL(`material/courses/${courseId}?revision=1`, this.apiV2Base);
    const res = await fetchJsonWithRetry<unknown>(
      url,
      { method: 'GET', headers: this.headersFor(url) },
      {
        retries: 3,
        minDelayMs: 250,
        maxDelayMs: 2_000,
        retryOnStatus: (s) => s >= 500,
      },
    );
    if (!res.ok) throw new Error(`Course details request failed (${res.error.kind}): ${res.error.url}`);
    return parseCourseDetails(res.value);
  }

  async getChapterDetails(courseId: number, chapterId: number): Promise<NormalizedChapterDetails> {
    const url = new URL(`material/courses/${courseId}/chapters/${chapterId}?revision=1`, this.apiV2Base);
    const res = await fetchJsonWithRetry<unknown>(
      url,
      { method: 'GET', headers: this.headersFor(url) },
      {
        retries: 3,
        minDelayMs: 250,
        maxDelayMs: 2_000,
        retryOnStatus: (s) => s >= 500,
      },
    );
    if (!res.ok) throw new Error(`Chapter details request failed (${res.error.kind}): ${res.error.url}`);
    return parseChapterDetails(res.value);
  }

  async getLessonV1(courseId: number, chapterId: number, lessonId: number): Promise<NormalizedLessonV1> {
    const url = new URL(
      `https://api.nnn.ed.nico/v1/n_school/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}?revision=1`,
    );
    const res = await fetchJsonWithRetry<unknown>(
      url,
      { method: 'GET', headers: this.headersFor(url) },
      {
        retries: 3,
        minDelayMs: 250,
        maxDelayMs: 2_000,
        retryOnStatus: (s) => s >= 500,
      },
    );
    if (!res.ok) throw new Error(`Lesson v1 request failed (${res.error.kind}): ${res.error.url}`);
    return parseLessonV1(res.value);
  }

  async getMovieV2(courseId: number, chapterId: number, movieId: number): Promise<NormalizedMovieV2> {
    const url = new URL(`material/courses/${courseId}/chapters/${chapterId}/movies/${movieId}?revision=1`, this.apiV2Base);
    const res = await fetchJsonWithRetry<unknown>(
      url,
      { method: 'GET', headers: this.headersFor(url) },
      {
        retries: 3,
        minDelayMs: 250,
        maxDelayMs: 2_000,
        retryOnStatus: (s) => s >= 500,
      },
    );
    if (!res.ok) throw new Error(`Movie details request failed (${res.error.kind}): ${res.error.url}`);
    return parseMovieV2(res.value);
  }

  async resolveFirstLecture(courseId: number): Promise<ResolvedLecture> {
    return resolveFirstLectureForClient(this, courseId);
  }

  async getCourseChapters(courseId: number): Promise<{ courseTitle?: string; chapters: CourseChapter[] }> {
    const course = await this.getCourseDetails(courseId);
    const chapters = [...course.chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const result: { courseTitle?: string; chapters: CourseChapter[] } = { chapters };
    if (course.title) result.courseTitle = course.title;
    return result;
  }

  async resolveCourseLessons(params: {
    courseId: number;
    chapterIds?: number[];
    maxConcurrency: number;
    limitLessons?: number;
  }): Promise<CourseStructure> {
    return resolveCourseLessonsForClient(this, params);
  }
}
