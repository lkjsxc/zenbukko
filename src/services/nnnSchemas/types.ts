export type NormalizedCourseDetails = {
  title?: string;
  chapters: Array<{ id: number; title?: string; order?: number }>;
};

export type NormalizedChapterDetails = {
  title?: string;
  sections: Array<{
    id: number;
    title?: string;
    kind: 'lesson' | 'movie' | 'exercise' | 'report' | 'other';
    contentUrl?: string;
  }>;
};

export type NormalizedLessonV1 = {
  title?: string;
  videoUrl: string;
  references: Array<{ title?: string; contentUrl: string }>;
  parts?: Array<{
    title?: string;
    videoUrl: string;
    references: Array<{ title?: string; contentUrl: string }>;
  }>;
};

export type NormalizedMovieV2 = {
  title?: string;
  videoUrl: string;
  referencePageUrls: string[];
};
