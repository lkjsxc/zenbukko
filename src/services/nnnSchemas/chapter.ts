import { z } from 'zod';
import type { NormalizedChapterDetails } from './types.js';

const DataSectionSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  section_type: z.string(),
  content_id: z.union([z.number(), z.string()]).optional(),
  content_url: z.string().url().optional(),
});

const ChapterDetailsDataSchema = z.object({
  data: z.object({ title: z.string().optional(), sections: z.array(DataSectionSchema) }),
});

const CurrentSectionSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  resource_type: z.string().optional(),
  content_url: z.string().url().optional(),
});

const ChapterDetailsCurrentSchema = z.object({
  chapter: z.object({
    title: z.string().optional(),
    sections: z.array(CurrentSectionSchema).optional(),
    class_headers: z.array(z.object({ sections: z.array(CurrentSectionSchema) })).optional(),
  }),
  sections: z.array(CurrentSectionSchema).optional(),
});

export function parseChapterDetails(input: unknown): NormalizedChapterDetails {
  const dataEnvelope = ChapterDetailsDataSchema.safeParse(input);
  if (dataEnvelope.success) {
    const { title, sections } = dataEnvelope.data.data;
    return {
      ...(title ? { title } : {}),
      sections: sections.map((section) => normalizeSection({
        id: typeof section.content_id === 'string' ? Number(section.content_id) : (section.content_id ?? section.id),
        title: section.title,
        resourceType: section.section_type,
        contentUrl: section.content_url,
      })),
    };
  }

  const current = ChapterDetailsCurrentSchema.parse(input);
  const sections = current.sections ?? current.chapter.sections ?? current.chapter.class_headers?.flatMap((header) => header.sections) ?? [];
  return {
    ...(current.chapter.title ? { title: current.chapter.title } : {}),
    sections: sections.map((section) => normalizeSection({
      id: section.id,
      title: section.title,
      resourceType: section.resource_type,
      contentUrl: section.content_url,
    })),
  };
}

function normalizeSection(params: {
  id: number;
  title?: string | undefined;
  resourceType?: string | undefined;
  contentUrl?: string | undefined;
}): NormalizedChapterDetails['sections'][number] {
  const result: NormalizedChapterDetails['sections'][number] = {
    id: params.id,
    kind: sectionKind(params.resourceType, params.title),
  };
  if (params.title) result.title = params.title;
  if (params.contentUrl) result.contentUrl = params.contentUrl;
  return result;
}

function sectionKind(resourceType: string | undefined, title: string | undefined): NormalizedChapterDetails['sections'][number]['kind'] {
  const normalizedType = resourceType?.trim().toLowerCase();
  if (normalizedType === 'lesson') return 'lesson';
  if (normalizedType === 'movie') return 'movie';
  if (normalizedType === 'exercise') return 'exercise';
  if (/(?:report|assignment)/i.test(normalizedType ?? '')) return 'report';
  if (/(?:確認|小)テスト/.test(title ?? '')) return 'exercise';
  if (/(?:レポート|課題)/.test(title ?? '')) return 'report';
  return 'other';
}
