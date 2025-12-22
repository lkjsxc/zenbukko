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
    const course = await this.getCourseDetails(courseId);
    const sortedChapters = [...course.chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const firstChapter = sortedChapters[0];
    if (!firstChapter) throw new Error(`No chapters found for course ${courseId}`);

    const chapter = await this.getChapterDetails(courseId, firstChapter.id);
    const firstSection = chapter.sections.find((s) => s.kind === 'lesson' || s.kind === 'movie');
    if (!firstSection) throw new Error(`No lecture sections found in chapter ${firstChapter.id}`);

    const contentId = firstSection.id;
    if (!Number.isFinite(contentId)) throw new Error(`Invalid content id: ${String(contentId)}`);

    const resolved: ResolvedLecture = {
      courseId,
      chapterId: firstChapter.id,
      lessonId: contentId,
      videoUrl: '',
    };

    let resolvedTitle: string | undefined;

    if (firstSection.kind === 'movie') {
      const movie = await this.getMovieV2(courseId, firstChapter.id, contentId);
      resolved.videoUrl = movie.videoUrl;
      resolvedTitle = movie.title;
      if (movie.referencePageUrls.length > 0) resolved.referencePageUrls = movie.referencePageUrls;
    } else {
      const lesson = await this.getLessonV1(courseId, firstChapter.id, contentId);
      resolved.videoUrl = lesson.videoUrl;
      resolvedTitle = lesson.title;
      const referencePageUrls = lesson.references
        .map((r) => r.contentUrl)
        .filter((u) => typeof u === 'string' && u.trim().length > 0);
      if (referencePageUrls.length > 0) resolved.referencePageUrls = referencePageUrls;
    }

    if (course.title) resolved.courseTitle = course.title;
    if (chapter.title) resolved.chapterTitle = chapter.title;
    const lt = resolvedTitle ?? firstSection.title;
    if (lt) resolved.lessonTitle = lt;

    return resolved;
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
    const { courseTitle, chapters } = await this.getCourseChapters(params.courseId);
    const allowed = new Set(params.chapterIds ?? chapters.map((c) => c.id));

    const selectedChapters = chapters.filter((c) => allowed.has(c.id));
    if (selectedChapters.length === 0) {
      throw new Error('No chapters selected (check --chapters filter).');
    }

    // First: fetch chapter sections to find lesson IDs.
    const chapterLessonIds: Array<{
      chapter: CourseChapter;
      lessonIds: number[];
      lessonTitles: Map<number, string>;
      lessonKinds: Map<number, 'lesson' | 'movie'>;
    }> = [];
    for (const chapter of selectedChapters) {
      // eslint-disable-next-line no-await-in-loop
      const details = await this.getChapterDetails(params.courseId, chapter.id);
      const lectureSections = details.sections.filter(
        (s): s is { id: number; title?: string; kind: 'lesson' | 'movie' } => s.kind === 'lesson' || s.kind === 'movie',
      );
      const lessonIds = lectureSections.map((s) => s.id);
      const lessonTitles = new Map<number, string>();
      const lessonKinds = new Map<number, 'lesson' | 'movie'>();
      for (const s of lectureSections) {
        lessonKinds.set(s.id, s.kind);
        if (s.title) lessonTitles.set(s.id, s.title);
      }
      const mergedChapter: CourseChapter = { id: chapter.id };
      if (typeof chapter.order === 'number' && Number.isFinite(chapter.order)) mergedChapter.order = chapter.order;
      const mergedTitle = details.title ?? chapter.title;
      if (mergedTitle) mergedChapter.title = mergedTitle;
      chapterLessonIds.push({ chapter: mergedChapter, lessonIds, lessonTitles, lessonKinds });
    }

    // Second: resolve each lesson to a signed HLS URL (v1).
    const queue: Array<{ chapter: CourseChapter; lessonId: number; lessonTitle?: string; kind: 'lesson' | 'movie' }> = [];
    for (const entry of chapterLessonIds) {
      for (const lessonId of entry.lessonIds) {
        if (typeof params.limitLessons === 'number' && Number.isFinite(params.limitLessons)) {
          if (queue.length >= Math.max(0, Math.floor(params.limitLessons))) break;
        }
        const kind = entry.lessonKinds.get(lessonId) ?? 'lesson';
        const item: { chapter: CourseChapter; lessonId: number; lessonTitle?: string; kind: 'lesson' | 'movie' } = {
          chapter: entry.chapter,
          lessonId,
          kind,
        };
        const t = entry.lessonTitles.get(lessonId);
        if (t) item.lessonTitle = t;
        queue.push(item);
      }

      if (typeof params.limitLessons === 'number' && Number.isFinite(params.limitLessons)) {
        if (queue.length >= Math.max(0, Math.floor(params.limitLessons))) break;
      }
    }

    const maxConcurrency = Math.max(1, Math.floor(params.maxConcurrency));
    const lessons: CourseLesson[] = [];
    const skippedLessons: Array<{ chapterId: number; lessonId: number; reason: string }> = [];

    for (let i = 0; i < queue.length; i += maxConcurrency) {
      const batch = queue.slice(i, i + maxConcurrency);
      // eslint-disable-next-line no-await-in-loop
      const resolved = await Promise.all(
        batch.map(async (item) => {
          try {
            if (item.kind === 'movie') {
              const movie = await this.getMovieV2(params.courseId, item.chapter.id, item.lessonId);
              const result: CourseLesson = {
                chapterId: item.chapter.id,
                lessonId: item.lessonId,
                videoUrl: movie.videoUrl,
              };
              if (movie.referencePageUrls.length > 0) result.referencePageUrls = movie.referencePageUrls;

              if (item.chapter.title) result.chapterTitle = item.chapter.title;
              const lt = movie.title ?? item.lessonTitle;
              if (lt) result.lessonTitle = lt;
              return result;
            }

            const lesson = await this.getLessonV1(params.courseId, item.chapter.id, item.lessonId);
            const result: CourseLesson = {
              chapterId: item.chapter.id,
              lessonId: item.lessonId,
              videoUrl: lesson.videoUrl,
            };

            if (Array.isArray(lesson.parts) && lesson.parts.length > 0) {
              const items = lesson.parts
                .map((p, idx) => {
                  const refUrls = p.references
                    .map((r) => r.contentUrl)
                    .filter((u) => typeof u === 'string' && u.trim().length > 0);

                  return {
                    index: idx + 1,
                    ...(p.title ? { title: p.title } : {}),
                    videoUrl: p.videoUrl,
                    ...(refUrls.length > 0 ? { referencePageUrls: refUrls } : {}),
                  };
                })
                .filter((x) => typeof x.videoUrl === 'string' && x.videoUrl.length > 0);

              if (items.length > 0) {
                result.videoItems = items;
                const first = items[0];
                if (first) {
                  result.videoUrl = first.videoUrl;
                  if (first.referencePageUrls && first.referencePageUrls.length > 0) {
                    result.referencePageUrls = first.referencePageUrls;
                  }
                }
              }
            } else {
              const referencePageUrls = lesson.references
                .map((r) => r.contentUrl)
                .filter((u) => typeof u === 'string' && u.trim().length > 0);
              if (referencePageUrls.length > 0) result.referencePageUrls = referencePageUrls;
            }

            if (item.chapter.title) result.chapterTitle = item.chapter.title;
            const lt = lesson.title ?? item.lessonTitle;
            if (lt) result.lessonTitle = lt;

            return result;
          } catch (e) {
            skippedLessons.push({
              chapterId: item.chapter.id,
              lessonId: item.lessonId,
              reason: e instanceof Error ? e.message : String(e),
            });
            return null;
          }
        }),
      );
      lessons.push(...resolved.filter((x): x is CourseLesson => Boolean(x)));
    }

    const result: CourseStructure = {
      courseId: params.courseId,
      ...(courseTitle ? { courseTitle } : {}),
      chapters: selectedChapters,
      lessons,
    };
    if (skippedLessons.length > 0) result.skippedLessons = skippedLessons;
    return result;
  }
}
