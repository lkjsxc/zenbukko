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
    kind: 'lesson' | 'movie' | 'other';
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
      kind:
        s.resource_type === 'lesson'
          ? 'lesson'
          : s.resource_type === 'movie'
            ? 'movie'
            : 'other',
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

    // On-demand lessons sometimes contain multiple "video + references" pairs.
    // The exact field name varies; support a few common patterns.
    contents: z
      .array(
        z.object({
          title: z.string().optional(),
          video_url: z.string().url().optional(),
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
      )
      .optional(),
    units: z
      .array(
        z.object({
          title: z.string().optional(),
          video_url: z.string().url().optional(),
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
      )
      .optional(),
    items: z
      .array(
        z.object({
          title: z.string().optional(),
          video_url: z.string().url().optional(),
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
      )
      .optional(),
  }),
});

const MovieV2Schema = z.object({
  title: z.string().optional(),
  videos: z
    .array(
      z.object({
        files: z
          .object({
            hls: z.object({ url: z.string().url() }).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  references: z
    .array(
      z.object({
        content_urls: z.array(z.string().url()).optional(),
      }),
    )
    .optional(),
});

export function parseMovieV2(input: unknown): NormalizedMovieV2 {
  const m = MovieV2Schema.parse(input);
  const videoUrl = m.videos?.[0]?.files?.hls?.url;
  if (!videoUrl) {
    throw new Error('Could not find an HLS URL in movie response (expected videos[0].files.hls.url).');
  }

  const referencePageUrls = (m.references ?? [])
    .flatMap((r) => r.content_urls ?? [])
    .filter((u) => typeof u === 'string' && u.trim().length > 0);

  return {
    ...(m.title ? { title: m.title } : {}),
    videoUrl,
    referencePageUrls,
  };
}

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

  const normalizeRefs = (
    refs: ReadonlyArray<{ title?: string | undefined; content_url: string }>,
  ): Array<{ title?: string; contentUrl: string }> =>
    refs.map((r) => ({
      ...(r.title ? { title: r.title } : {}),
      contentUrl: r.content_url,
    }));

  const lessonRefsRaw = current.lesson.references ?? [];

  const partsSource =
    (Array.isArray(current.lesson.contents) && current.lesson.contents.length > 0
      ? current.lesson.contents
      : Array.isArray(current.lesson.units) && current.lesson.units.length > 0
        ? current.lesson.units
        : Array.isArray(current.lesson.items) && current.lesson.items.length > 0
          ? current.lesson.items
          : null);

  if (partsSource) {
    const parts = partsSource
      .map((p) => {
        const videoUrl = p.video_url ?? p.archive?.url?.hls;
        if (!videoUrl) return null;
        const rawRefs = p.references ?? lessonRefsRaw;
        const refs = normalizeRefs(rawRefs);
        return {
          ...(p.title ? { title: p.title } : {}),
          videoUrl,
          references: refs,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (parts.length > 0) {
      const firstPart = parts[0];
      if (!firstPart) {
        throw new Error('Unexpected empty parts array after filtering video URLs.');
      }
      return {
        ...(current.lesson.title ? { title: current.lesson.title } : {}),
        videoUrl: firstPart.videoUrl,
        references: firstPart.references,
        parts,
      };
    }
  }

  const videoUrl = current.lesson.video_url ?? current.lesson.archive?.url?.hls;
  if (!videoUrl) {
    throw new Error('Could not find an HLS URL in lesson response (expected lesson.video_url or lesson.archive.url.hls).');
  }

  return {
    ...(current.lesson.title ? { title: current.lesson.title } : {}),
    videoUrl,
    references: normalizeRefs(lessonRefsRaw),
  };
}
