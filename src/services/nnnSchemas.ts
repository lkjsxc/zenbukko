import { z } from 'zod';

export type NormalizedCourseDetails = {
  title?: string;
  chapters: Array<{ id: number; title?: string; order?: number }>;
};

export type NormalizedChapterDetails = {
  title?: string;
  sections: Array<{
    id: number;
    title?: string;
    kind: 'lesson' | 'other';
  }>;
};

export type NormalizedLessonV1 = {
  title?: string;
  videoUrl: string;
  references: Array<{ title?: string; contentUrl: string }>;
};

const CourseDetailsLegacySchema = z.object({
  data: z.object({
    title: z.string().optional(),
    chapters: z.array(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        order: z.number().optional(),
      }),
    ),
  }),
});

const CourseDetailsCurrentSchema = z.object({
  course: z.object({
    title: z.string().optional(),
    chapters: z.array(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        order: z.number().optional(),
      }),
    ),
  }),
});

export function parseCourseDetails(input: unknown): NormalizedCourseDetails {
  const legacy = CourseDetailsLegacySchema.safeParse(input);
  if (legacy.success) {
    return {
      ...(legacy.data.data.title ? { title: legacy.data.data.title } : {}),
      chapters: legacy.data.data.chapters.map((c) => ({
        id: c.id,
        ...(c.title ? { title: c.title } : {}),
        ...(c.order !== undefined ? { order: c.order } : {}),
      })),
    };
  }

  const current = CourseDetailsCurrentSchema.parse(input);
  return {
    ...(current.course.title ? { title: current.course.title } : {}),
    chapters: current.course.chapters.map((c) => ({
      id: c.id,
      ...(c.title ? { title: c.title } : {}),
      ...(c.order !== undefined ? { order: c.order } : {}),
    })),
  };
}

const ChapterDetailsLegacySchema = z.object({
  data: z.object({
    title: z.string().optional(),
    sections: z.array(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        section_type: z.string(),
        content_id: z.union([z.number(), z.string()]).optional(),
      }),
    ),
  }),
});

const CurrentSectionSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  resource_type: z.string().optional(),
});

const ChapterDetailsCurrentSchema = z.union([
  z.object({
    chapter: z.object({
      title: z.string().optional(),
      sections: z.array(CurrentSectionSchema),
    }),
  }),
  z.object({
    chapter: z.object({
      title: z.string().optional(),
    }),
    sections: z.array(CurrentSectionSchema),
  }),
]);

export function parseChapterDetails(input: unknown): NormalizedChapterDetails {
  const legacy = ChapterDetailsLegacySchema.safeParse(input);
  if (legacy.success) {
    return {
      ...(legacy.data.data.title ? { title: legacy.data.data.title } : {}),
      sections: legacy.data.data.sections.map((s) => {
        const id = typeof s.content_id === 'string' ? Number(s.content_id) : (s.content_id ?? s.id);
        return {
          id,
          ...(s.title ? { title: s.title } : {}),
          kind: s.section_type === 'lesson' ? 'lesson' : 'other',
        };
      }),
    };
  }

  const current = ChapterDetailsCurrentSchema.parse(input);
  const sections = 'sections' in current ? current.sections : current.chapter.sections;

  return {
    ...(current.chapter.title ? { title: current.chapter.title } : {}),
    sections: sections.map((s) => ({
      id: s.id,
      ...(s.title ? { title: s.title } : {}),
      kind: s.resource_type === 'lesson' ? 'lesson' : 'other',
    })),
  };
}

const LessonV1LegacySchema = z.object({
  data: z.object({
    video_url: z.string().url(),
    title: z.string().optional(),
    references: z
      .array(
        z.object({
          title: z.string().optional(),
          content_url: z.string().min(1),
        }),
      )
      .optional(),
  }),
});

const LessonV1CurrentSchema = z.object({
  lesson: z.object({
    video_url: z.string().url().optional(),
    title: z.string().optional(),
    archive: z
      .object({
        url: z
          .object({
            hls: z.string().url().optional(),
          })
          .optional(),
      })
      .optional(),
    references: z
      .array(
        z.object({
          title: z.string().optional(),
          content_url: z.string().min(1),
        }),
      )
      .optional(),
  }),
});

export function parseLessonV1(input: unknown): NormalizedLessonV1 {
  const legacy = LessonV1LegacySchema.safeParse(input);
  if (legacy.success) {
    return {
      ...(legacy.data.data.title ? { title: legacy.data.data.title } : {}),
      videoUrl: legacy.data.data.video_url,
      references: (legacy.data.data.references ?? []).map((r) => ({
        ...(r.title ? { title: r.title } : {}),
        contentUrl: r.content_url,
      })),
    };
  }

  const current = LessonV1CurrentSchema.parse(input);
  const videoUrl =
    current.lesson.video_url ?? current.lesson.archive?.url?.hls;
  if (!videoUrl) {
    throw new Error('Could not find an HLS URL in lesson response (expected lesson.video_url or lesson.archive.url.hls).');
  }

  return {
    ...(current.lesson.title ? { title: current.lesson.title } : {}),
    videoUrl,
    references: (current.lesson.references ?? []).map((r) => ({
      ...(r.title ? { title: r.title } : {}),
      contentUrl: r.content_url,
    })),
  };
}
