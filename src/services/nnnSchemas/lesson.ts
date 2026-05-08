import { z } from 'zod';
import type { NormalizedLessonV1 } from './types.js';

const RefSchema = z.object({ title: z.string().optional(), content_url: z.string().min(1) });
const PartSchema = z.object({
  title: z.string().optional(),
  video_url: z.string().url().optional(),
  archive: z.object({ url: z.object({ hls: z.string().url().optional() }).optional() }).optional(),
  references: z.array(RefSchema).optional(),
});

const LessonDataSchema = z.object({
  data: z.object({
    video_url: z.string().url(),
    title: z.string().optional(),
    references: z.array(RefSchema).optional(),
  }),
});

const LessonV1CurrentSchema = z.object({
  lesson: z.object({
    video_url: z.string().url().optional(),
    title: z.string().optional(),
    archive: z.object({ url: z.object({ hls: z.string().url().optional() }).optional() }).optional(),
    references: z.array(RefSchema).optional(),
    contents: z.array(PartSchema).optional(),
    units: z.array(PartSchema).optional(),
    items: z.array(PartSchema).optional(),
  }),
});

export function parseLessonV1(input: unknown): NormalizedLessonV1 {
  const dataEnvelope = LessonDataSchema.safeParse(input);
  if (dataEnvelope.success) {
    return {
      ...(dataEnvelope.data.data.title ? { title: dataEnvelope.data.data.title } : {}),
      videoUrl: dataEnvelope.data.data.video_url,
      references: normalizeRefs(dataEnvelope.data.data.references ?? []),
    };
  }

  const current = LessonV1CurrentSchema.parse(input);
  const lessonRefs = current.lesson.references ?? [];
  const parts = normalizeParts(current.lesson.contents ?? current.lesson.units ?? current.lesson.items, lessonRefs);
  if (parts.length > 0) {
    const firstPart = parts[0];
    if (!firstPart) throw new Error('Unexpected empty parts array after filtering video URLs.');
    return {
      ...(current.lesson.title ? { title: current.lesson.title } : {}),
      videoUrl: firstPart.videoUrl,
      references: firstPart.references,
      parts,
    };
  }

  const videoUrl = current.lesson.video_url ?? current.lesson.archive?.url?.hls;
  if (!videoUrl) throw new Error('Could not find an HLS URL in lesson response (expected lesson.video_url or lesson.archive.url.hls).');
  return {
    ...(current.lesson.title ? { title: current.lesson.title } : {}),
    videoUrl,
    references: normalizeRefs(lessonRefs),
  };
}

function normalizeParts(parts: z.infer<typeof PartSchema>[] | undefined, lessonRefs: z.infer<typeof RefSchema>[]) {
  return (parts ?? [])
    .map((p) => {
      const videoUrl = p.video_url ?? p.archive?.url?.hls;
      if (!videoUrl) return null;
      return {
        ...(p.title ? { title: p.title } : {}),
        videoUrl,
        references: normalizeRefs(p.references ?? lessonRefs),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

function normalizeRefs(refs: ReadonlyArray<z.infer<typeof RefSchema>>): Array<{ title?: string; contentUrl: string }> {
  return refs.map((r) => ({
    ...(r.title ? { title: r.title } : {}),
    contentUrl: r.content_url,
  }));
}
