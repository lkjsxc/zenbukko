import type { JobKind } from './types.js';
import { booleanFrom, csvNumbers, numberFrom, stringFrom } from './requestUtils.js';

const LOCAL_OCR_FIELDS = new Set(['ndlocrCommand', 'ndlocrDevice', 'ocrPageDpi', 'ocrKeepIntermediates', 'ndlocrEnableTcy']);
const OCR_JOB_FIELDS = new Set(['kind', 'inputDir', 'ocrForce', ...LOCAL_OCR_FIELDS]);
const DOWNLOAD_FIELDS = new Set([
  'kind',
  'learningUrl',
  'chapters',
  'chapterRange',
  'lessonIds',
  'firstLectureOnly',
  'maxConcurrency',
  'transcribe',
  'transcribeModel',
  'transcribeFormat',
  'transcribeLanguage',
  'materials',
  'deleteMediaAfterTranscribe',
  'ocrMaterials',
  'ocrForce',
  ...LOCAL_OCR_FIELDS,
]);

export function normalizeJobRequest(kind: JobKind, body: Record<string, unknown>): Record<string, unknown> {
  if (kind === 'ocr-materials') {
    rejectUnknownFields(body, OCR_JOB_FIELDS);
    return { inputDir: stringFrom(body.inputDir, ''), ocrForce: booleanFrom(body.ocrForce, false), ...localOcrFields(body) };
  }

  rejectUnknownFields(body, DOWNLOAD_FIELDS);
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
    ocrForce: booleanFrom(body.ocrForce, false),
    ...localOcrFields(body),
  };

  if (kind === 'download-all') return common;
  const learningUrl = requiredLearningUrl(body.learningUrl);
  return { ...common, learningUrl, courseId: extractCourseIdFromLearningUrl(learningUrl) };
}

function localOcrFields(body: Record<string, unknown>): Record<string, unknown> {
  return {
    ndlocrCommand: stringFrom(body.ndlocrCommand, 'ndlocr-lite'),
    ndlocrDevice: stringFrom(body.ndlocrDevice, 'cpu'),
    ocrPageDpi: numberFrom(body.ocrPageDpi, 300),
    ocrKeepIntermediates: booleanFrom(body.ocrKeepIntermediates, false),
    ndlocrEnableTcy: booleanFrom(body.ndlocrEnableTcy, true),
  };
}

function rejectUnknownFields(body: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`Unsupported request field: ${unknown[0]}`);
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
