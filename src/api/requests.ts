import type { JobKind } from './types.js';
import { booleanFrom, csvNumbers, stringFrom } from './requestUtils.js';

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
    maxConcurrency: integerInRange(body.maxConcurrency, 6, 1, 32, 'maxConcurrency'),
    transcribe: booleanFrom(body.transcribe, false),
    transcribeModel: stringFrom(body.transcribeModel, 'large-v3-turbo'),
    transcribeFormat: transcriptFormat(body.transcribeFormat),
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
    ndlocrDevice: ocrDevice(body.ndlocrDevice),
    ocrPageDpi: integerInRange(body.ocrPageDpi, 300, 72, 600, 'ocrPageDpi'),
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
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Learning page URL must be a valid URL.');
  }
  const nnnHost = url.hostname === 'nnn.ed.nico' || url.hostname.endsWith('.nnn.ed.nico');
  if (url.protocol !== 'https:' || !nnnHost || url.username || url.password) {
    throw new Error('Learning page URL must be an HTTPS URL on nnn.ed.nico.');
  }
  return url.toString();
}

function integerInRange(value: unknown, fallback: number, min: number, max: number, label: string): number {
  const number = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function ocrDevice(value: unknown): 'cpu' | 'cuda' {
  const device = stringFrom(value, 'cpu');
  if (device !== 'cpu' && device !== 'cuda') throw new Error('ndlocrDevice must be cpu or cuda.');
  return device;
}

function transcriptFormat(value: unknown): 'txt' | 'srt' | 'vtt' {
  const format = stringFrom(value, 'txt');
  if (format !== 'txt' && format !== 'srt' && format !== 'vtt') throw new Error('transcribeFormat must be txt, srt, or vtt.');
  return format;
}

function extractCourseIdFromLearningUrl(value: string): number {
  const url = new URL(value);
  const coursePathMatch = url.pathname.match(/\/courses\/(\d+)(?:\/|$)/);
  const courseId = coursePathMatch?.[1] ?? url.searchParams.get('course_id') ?? url.searchParams.get('courseId');
  const n = Number(courseId);
  if (!Number.isFinite(n)) throw new Error('Learning page URL must include a course ID, for example /courses/12345.');
  return n;
}
