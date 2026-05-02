import type { CourseLesson, CourseStructure } from '../../services/nnnClient.js';
import type { DownloadCommandParams } from './types.js';

export function selectLessons(structure: CourseStructure, params: DownloadCommandParams): CourseLesson[] {
  if (params.lessonIds && params.lessonIds.length > 0) {
    const requestedIds = params.lessonIds.map((v) => Number(v)).filter(Number.isFinite).map((v) => Math.trunc(v));
    const lessonById = new Map(structure.lessons.map((l) => [l.lessonId, l] as const));
    const missing = requestedIds.filter((id) => !lessonById.has(id));
    if (missing.length > 0) {
      const skipped = (structure.skippedLessons ?? [])
        .filter((s) => missing.includes(s.lessonId))
        .map((s) => `${s.lessonId} (${s.reason})`);
      const suffix = skipped.length > 0 ? `\nSkipped: ${skipped.join(', ')}` : '';
      throw new Error(`Requested lesson-id(s) could not be resolved: ${missing.join(', ')}${suffix}`);
    }
    return requestedIds.map((id) => lessonById.get(id)!);
  }

  if (params.firstLectureOnly) return structure.lessons.slice(0, 1);
  return structure.lessons;
}
