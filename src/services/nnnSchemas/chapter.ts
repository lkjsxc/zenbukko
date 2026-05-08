import { z } from 'zod';
import type { NormalizedChapterDetails } from './types.js';

const ChapterDetailsDataSchema = z.object({
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
  z.object({ chapter: z.object({ title: z.string().optional(), sections: z.array(CurrentSectionSchema) }) }),
  z.object({ chapter: z.object({ title: z.string().optional() }), sections: z.array(CurrentSectionSchema) }),
]);

export function parseChapterDetails(input: unknown): NormalizedChapterDetails {
  const dataEnvelope = ChapterDetailsDataSchema.safeParse(input);
  if (dataEnvelope.success) {
    return {
      ...(dataEnvelope.data.data.title ? { title: dataEnvelope.data.data.title } : {}),
      sections: dataEnvelope.data.data.sections.map((s) => ({
        id: typeof s.content_id === 'string' ? Number(s.content_id) : (s.content_id ?? s.id),
        ...(s.title ? { title: s.title } : {}),
        kind: s.section_type === 'lesson' ? 'lesson' : 'other',
      })),
    };
  }

  const current = ChapterDetailsCurrentSchema.parse(input);
  const sections = 'sections' in current ? current.sections : current.chapter.sections;
  return {
    ...(current.chapter.title ? { title: current.chapter.title } : {}),
    sections: sections.map((s) => ({
      id: s.id,
      ...(s.title ? { title: s.title } : {}),
      kind: s.resource_type === 'lesson' ? 'lesson' : s.resource_type === 'movie' ? 'movie' : 'other',
    })),
  };
}
