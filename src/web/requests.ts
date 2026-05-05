import type { JobKind } from './types.js';
import { DEFAULT_GEMINI_MODEL } from '../geminiDefaults.js';
import { booleanFrom, csvNumbers, numberFrom, stringFrom } from './requestUtils.js';

export function normalizeJobRequest(kind: JobKind, body: Record<string, unknown>): Record<string, unknown> {
  if (kind === 'ocr-materials') {
    return {
      inputDir: stringFrom(body.inputDir, ''),
      ocrModel: stringFrom(body.ocrModel, DEFAULT_GEMINI_MODEL),
      ocrForce: booleanFrom(body.ocrForce, false),
      ocrMode: stringFrom(body.ocrMode, 'auto'),
      ocrServiceTier: stringFrom(body.ocrServiceTier, 'flex'),
      ocrRetries: numberFrom(body.ocrRetries, 3),
      ocrTimeoutMs: numberFrom(body.ocrTimeoutMs, 900_000),
    };
  }

  const common = {
    chapters: csvNumbers(body.chapters),
    chapterRange: stringFrom(body.chapterRange, ''),
    lessonIds: csvNumbers(body.lessonIds),
    firstLectureOnly: booleanFrom(body.firstLectureOnly, false),
    maxConcurrency: numberFrom(body.maxConcurrency, 6),
    transcribe: booleanFrom(body.transcribe, false),
    transcribeModel: stringFrom(body.transcribeModel, 'large-v3-turbo'),
    transcribeFormat: stringFrom(body.transcribeFormat, 'txt'),
    transcribeLanguage: stringFrom(body.transcribeLanguage, 'ja'),
    materials: booleanFrom(body.materials, false),
    deleteMediaAfterTranscribe: booleanFrom(body.deleteMediaAfterTranscribe, true),
    ocrMaterials: booleanFrom(body.ocrMaterials, false),
    ocrModel: stringFrom(body.ocrModel, DEFAULT_GEMINI_MODEL),
    ocrForce: booleanFrom(body.ocrForce, false),
    ocrMode: stringFrom(body.ocrMode, 'auto'),
    ocrServiceTier: stringFrom(body.ocrServiceTier, 'flex'),
    ocrRetries: numberFrom(body.ocrRetries, 3),
    ocrTimeoutMs: numberFrom(body.ocrTimeoutMs, 900_000),
  };

  if (kind === 'download-all') return common;
  const learningUrl = requiredLearningUrl(body.learningUrl);
  return { ...common, learningUrl, courseId: extractCourseIdFromLearningUrl(learningUrl) };
}

function requiredLearningUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Learning page URL is required.');
  try {
    return new URL(value.trim()).toString();
  } catch {
    throw new Error('Learning page URL must be a valid URL.');
  }
}

function extractCourseIdFromLearningUrl(value: string): number {
  const url = new URL(value);
  const coursePathMatch = url.pathname.match(/\/courses\/(\d+)(?:\/|$)/);
  const courseId = coursePathMatch?.[1] ?? url.searchParams.get('course_id') ?? url.searchParams.get('courseId');
  const n = Number(courseId);
  if (!Number.isFinite(n)) throw new Error('Learning page URL must include a course ID, for example /courses/12345.');
  return n;
}
