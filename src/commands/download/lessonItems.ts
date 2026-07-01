import type { CourseLesson } from '../../services/nnnClient.js';
import type { DownloadCommandParams } from './types.js';
import type { ChapterMarkdown } from './chapterMarkdown.js';

export type LessonItem = {
  index: number;
  suffix: string;
  videoUrl: string;
  referencePageUrls?: string[];
};

export type WorkItem = {
  params: DownloadCommandParams;
  headers: Record<string, string>;
  chapterMarkdown: ChapterMarkdown;
  lesson: CourseLesson;
  item: LessonItem;
  lessonIndex: number;
  outFilePath: string;
};

export function lessonItems(lesson: CourseLesson): LessonItem[] {
  const items = lesson.videoItems && lesson.videoItems.length > 0
    ? lesson.videoItems
    : [{ index: 1, videoUrl: lesson.videoUrl, referencePageUrls: lesson.referencePageUrls }];
  const needsSuffix = items.length > 1;
  return items.map((item) => ({
    index: item.index,
    suffix: needsSuffix ? `_part-${item.index}` : '',
    videoUrl: item.videoUrl,
    ...(item.referencePageUrls ? { referencePageUrls: item.referencePageUrls } : {}),
  }));
}
