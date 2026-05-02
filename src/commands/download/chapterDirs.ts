import type { CourseChapter } from '../../services/nnnClient.js';

export function createChapterDirNamer(
  courseChapters: CourseChapter[],
  logger: { warn: (message: string) => void },
): { chapterDirNameForId: (chapterId: number) => string } {
  const chapterPadWidth = Math.max(2, String(courseChapters.length).length);
  const padChapter = (n: number): string => String(n).padStart(chapterPadWidth, '0');
  const chapterIndexById = new Map<number, number>();
  for (const [idx, chapter] of courseChapters.entries()) chapterIndexById.set(chapter.id, idx + 1);

  return {
    chapterDirNameForId(chapterId: number): string {
      const index = chapterIndexById.get(chapterId);
      if (index) return padChapter(index);
      const fallbackIndex = chapterIndexById.size + 1;
      chapterIndexById.set(chapterId, fallbackIndex);
      logger.warn(`Chapter ID ${chapterId} was not found in course chapter list; using fallback numeric folder ${padChapter(fallbackIndex)}`);
      return padChapter(fallbackIndex);
    },
  };
}
