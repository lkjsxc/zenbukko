import type { NnnClient, CourseChapter, CourseLesson, CourseReportAssignment, CourseStructure, ResolvedLecture } from './nnnClient.js';

type LectureItem = {
  chapter: CourseChapter;
  lessonId: number;
  lessonTitle?: string;
  kind: 'lesson' | 'movie';
};

export async function resolveFirstLectureForClient(client: NnnClient, courseId: number): Promise<ResolvedLecture> {
  const course = await client.getCourseDetails(courseId);
  const firstChapter = [...course.chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
  if (!firstChapter) throw new Error(`No chapters found for course ${courseId}`);
  const chapter = await client.getChapterDetails(courseId, firstChapter.id);
  const firstSection = chapter.sections.find((s) => s.kind === 'lesson' || s.kind === 'movie');
  if (!firstSection) throw new Error(`No lecture sections found in chapter ${firstChapter.id}`);

  const contentId = firstSection.id;
  if (!Number.isFinite(contentId)) throw new Error(`Invalid content id: ${String(contentId)}`);
  const resolved: ResolvedLecture = { courseId, chapterId: firstChapter.id, lessonId: contentId, videoUrl: '' };
  let resolvedTitle: string | undefined;

  if (firstSection.kind === 'movie') {
    const movie = await client.getMovieV2(courseId, firstChapter.id, contentId);
    resolved.videoUrl = movie.videoUrl;
    resolvedTitle = movie.title;
    if (movie.referencePageUrls.length > 0) resolved.referencePageUrls = movie.referencePageUrls;
  } else {
    const lesson = await client.getLessonV1(courseId, firstChapter.id, contentId);
    resolved.videoUrl = lesson.videoUrl;
    resolvedTitle = lesson.title;
    const refs = lesson.references.map((r) => r.contentUrl).filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (refs.length > 0) resolved.referencePageUrls = refs;
  }

  if (course.title) resolved.courseTitle = course.title;
  if (chapter.title) resolved.chapterTitle = chapter.title;
  const title = resolvedTitle ?? firstSection.title;
  if (title) resolved.lessonTitle = title;
  return resolved;
}

export async function resolveCourseLessonsForClient(
  client: NnnClient,
  params: { courseId: number; chapterIds?: number[]; maxConcurrency: number; limitLessons?: number },
): Promise<CourseStructure> {
  const { courseTitle, chapters } = await client.getCourseChapters(params.courseId);
  const selectedChapters = chapters.filter((c) => new Set(params.chapterIds ?? chapters.map((x) => x.id)).has(c.id));
  if (selectedChapters.length === 0) throw new Error('No chapters selected (check --chapters filter).');

  const { lectures, reportAssignments } = await buildLectureQueue(client, params.courseId, selectedChapters, params.limitLessons);
  const maxConcurrency = Math.max(1, Math.floor(params.maxConcurrency));
  const lessons: CourseLesson[] = [];
  const skippedLessons: Array<{ chapterId: number; lessonId: number; reason: string }> = [];

  for (let i = 0; i < lectures.length; i += maxConcurrency) {
    const batch = lectures.slice(i, i + maxConcurrency);
    const resolved = await Promise.all(batch.map((item) => resolveLectureItem(client, params.courseId, item, skippedLessons)));
    lessons.push(...resolved.filter((x): x is CourseLesson => Boolean(x)));
  }

  const result: CourseStructure = {
    courseId: params.courseId,
    ...(courseTitle ? { courseTitle } : {}),
    chapters: selectedChapters,
    lessons,
    reportAssignments,
  };
  if (skippedLessons.length > 0) result.skippedLessons = skippedLessons;
  return result;
}

async function buildLectureQueue(
  client: NnnClient,
  courseId: number,
  chapters: CourseChapter[],
  limitLessons?: number,
): Promise<{ lectures: LectureItem[]; reportAssignments: CourseReportAssignment[] }> {
  const lectures: LectureItem[] = [];
  const reportAssignments: CourseReportAssignment[] = [];
  for (const chapter of chapters) {
    const details = await client.getChapterDetails(courseId, chapter.id);
    const merged = mergeChapter(chapter, details.title);
    for (const section of details.sections) {
      const report = toReportAssignment(merged, section);
      if (report) reportAssignments.push(report);
      if (section.kind !== 'lesson' && section.kind !== 'movie') continue;
      if (typeof limitLessons === 'number' && lectures.length >= Math.max(0, Math.floor(limitLessons))) continue;
      const item: LectureItem = { chapter: merged, lessonId: section.id, kind: section.kind };
      if (section.title) item.lessonTitle = section.title;
      lectures.push(item);
    }
  }
  return { lectures, reportAssignments };
}

function toReportAssignment(
  chapter: CourseChapter,
  section: { id: number; title?: string; kind: 'lesson' | 'movie' | 'report' | 'other'; contentUrl?: string },
): CourseReportAssignment | undefined {
  if (section.kind !== 'report' || !section.contentUrl) return undefined;
  const result: CourseReportAssignment = { chapterId: chapter.id, assignmentId: section.id, contentUrl: section.contentUrl };
  if (chapter.title) result.chapterTitle = chapter.title;
  if (section.title) result.title = section.title;
  return result;
}

async function resolveLectureItem(
  client: NnnClient,
  courseId: number,
  item: LectureItem,
  skipped: Array<{ chapterId: number; lessonId: number; reason: string }>,
): Promise<CourseLesson | null> {
  try {
    return item.kind === 'movie' ? await resolveMovieItem(client, courseId, item) : await resolveLessonItem(client, courseId, item);
  } catch (e) {
    skipped.push({ chapterId: item.chapter.id, lessonId: item.lessonId, reason: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

async function resolveMovieItem(client: NnnClient, courseId: number, item: LectureItem): Promise<CourseLesson> {
  const movie = await client.getMovieV2(courseId, item.chapter.id, item.lessonId);
  const result = baseLesson(item, movie.videoUrl);
  if (movie.referencePageUrls.length > 0) result.referencePageUrls = movie.referencePageUrls;
  const title = movie.title ?? item.lessonTitle;
  if (title) result.lessonTitle = title;
  return result;
}

async function resolveLessonItem(client: NnnClient, courseId: number, item: LectureItem): Promise<CourseLesson> {
  const lesson = await client.getLessonV1(courseId, item.chapter.id, item.lessonId);
  const result = baseLesson(item, lesson.videoUrl);
  const parts = lesson.parts?.map((p, idx) => {
    const refs = p.references.map((r) => r.contentUrl).filter((u) => typeof u === 'string' && u.trim().length > 0);
    return { index: idx + 1, ...(p.title ? { title: p.title } : {}), videoUrl: p.videoUrl, ...(refs.length > 0 ? { referencePageUrls: refs } : {}) };
  });
  if (parts && parts.length > 0) {
    result.videoItems = parts;
    result.videoUrl = parts[0]?.videoUrl ?? result.videoUrl;
    if (parts[0]?.referencePageUrls) result.referencePageUrls = parts[0].referencePageUrls;
  } else {
    const refs = lesson.references.map((r) => r.contentUrl).filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (refs.length > 0) result.referencePageUrls = refs;
  }
  const title = lesson.title ?? item.lessonTitle;
  if (title) result.lessonTitle = title;
  return result;
}

function baseLesson(item: LectureItem, videoUrl: string): CourseLesson {
  return { chapterId: item.chapter.id, ...(item.chapter.title ? { chapterTitle: item.chapter.title } : {}), lessonId: item.lessonId, videoUrl };
}

function mergeChapter(chapter: CourseChapter, title?: string): CourseChapter {
  return { id: chapter.id, ...(typeof chapter.order === 'number' && Number.isFinite(chapter.order) ? { order: chapter.order } : {}), ...(title ?? chapter.title ? { title: title ?? chapter.title } : {}) };
}
