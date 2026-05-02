import { z } from 'zod';
import type { NormalizedCourseDetails } from './types.js';

const ChapterSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  order: z.number().optional(),
});

const CourseDetailsLegacySchema = z.object({
  data: z.object({
    title: z.string().optional(),
    chapters: z.array(ChapterSchema),
  }),
});

const CourseDetailsCurrentSchema = z.object({
  course: z.object({
    title: z.string().optional(),
    chapters: z.array(ChapterSchema),
  }),
});

export function parseCourseDetails(input: unknown): NormalizedCourseDetails {
  const legacy = CourseDetailsLegacySchema.safeParse(input);
  if (legacy.success) return fromParts(legacy.data.data.title, legacy.data.data.chapters);

  const current = CourseDetailsCurrentSchema.parse(input);
  return fromParts(current.course.title, current.course.chapters);
}

function fromParts(title: string | undefined, chapters: z.infer<typeof ChapterSchema>[]): NormalizedCourseDetails {
  return {
    ...(title ? { title } : {}),
    chapters: chapters.map((c) => ({
      id: c.id,
      ...(c.title ? { title: c.title } : {}),
      ...(c.order !== undefined ? { order: c.order } : {}),
    })),
  };
}
