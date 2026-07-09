import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import { downloadCommand } from '../commands/download.js';
import { downloadAllCommand } from '../commands/downloadAll.js';
import { ocrMaterialsCommand } from '../services/ocr/index.js';
import type { Logger } from '../utils/log.js';
import { assertPathInsideOrEqual } from '../utils/portablePath.js';
import type { JobRecord } from './types.js';
import { booleanFrom, numberFrom, optionalNumberArray, stringFrom } from './requestUtils.js';
import { getEffectiveApiSettings, type EffectiveApiSettings } from './settings.js';

export async function runJob(job: JobRecord, cfg: AppConfig, stateDir: string, logger: Logger): Promise<void> {
  const settings = await getEffectiveApiSettings(cfg, stateDir);
  if (job.kind === 'ocr-materials') {
    await ocrMaterialsCommand({
      inputDir: await resolveOcrInputDir(cfg.outputDir, stringFrom(job.request.inputDir, cfg.outputDir)),
      force: booleanFrom(job.request.ocrForce, false),
      ...localOcrFromRequest(job.request, settings),
      logger,
    });
    return;
  }

  const common = {
    sessionPath: cfg.sessionPath,
    outputDir: cfg.outputDir,
    maxConcurrency: numberFrom(job.request.maxConcurrency, 6),
    transcribe: booleanFrom(job.request.transcribe, false),
    transcribeModel: stringFrom(job.request.transcribeModel, 'large-v3-turbo'),
    transcribeFormat: stringFrom(job.request.transcribeFormat, 'txt') as 'txt' | 'srt' | 'vtt',
    transcribeLanguage: stringFrom(job.request.transcribeLanguage, 'ja'),
    deleteMediaAfterTranscribe: booleanFrom(job.request.deleteMediaAfterTranscribe, true),
    materials: booleanFrom(job.request.materials, false) || booleanFrom(job.request.ocrMaterials, false),
    ocrMaterials: booleanFrom(job.request.ocrMaterials, false),
    ocrForce: booleanFrom(job.request.ocrForce, false),
    ...localOcrFromRequest(job.request, settings),
    logger,
  };

  if (job.kind === 'download-all') {
    await downloadAllCommand({ ...common, headless: cfg.puppeteerHeadless });
    return;
  }

  const courseId = numberFrom(job.request.courseId, NaN);
  if (!Number.isFinite(courseId)) throw new Error('courseId is required for download jobs.');
  const chapters = optionalNumberArray(job.request.chapters);
  const lessonIds = optionalNumberArray(job.request.lessonIds);
  const chapterRange = stringFrom(job.request.chapterRange, '');
  await downloadCommand({
    ...common,
    courseId,
    ...(chapters ? { chapters } : {}),
    ...(chapterRange ? { chapterRange } : {}),
    ...(lessonIds ? { lessonIds } : {}),
    firstLectureOnly: booleanFrom(job.request.firstLectureOnly, false),
  });
}

export async function resolveOcrInputDir(outputDir: string, requested: string): Promise<string> {
  const rootPath = path.resolve(outputDir);
  const requestedPath = path.isAbsolute(requested) ? requested : path.resolve(rootPath, requested);
  const root = await fs.realpath(rootPath);
  const input = await fs.realpath(requestedPath);
  assertPathInsideOrEqual(root, input);
  if (!(await fs.stat(input)).isDirectory()) throw new Error('OCR input must be a directory under the configured output directory.');
  return input;
}

function localOcrFromRequest(request: Record<string, unknown>, settings: EffectiveApiSettings) {
  return {
    ndlocrCommand: stringFrom(request.ndlocrCommand, settings.ndlocrCommand),
    ndlocrDevice: ocrDeviceFrom(request.ndlocrDevice, settings.ndlocrDevice),
    ocrPageDpi: numberFrom(request.ocrPageDpi, settings.ocrPageDpi),
    ocrKeepIntermediates: booleanFrom(request.ocrKeepIntermediates, settings.ocrKeepIntermediates),
    ndlocrEnableTcy: booleanFrom(request.ndlocrEnableTcy, settings.ndlocrEnableTcy),
  };
}

function ocrDeviceFrom(value: unknown, fallback: 'cpu' | 'cuda'): 'cpu' | 'cuda' {
  return value === 'cpu' || value === 'cuda' ? value : fallback;
}
