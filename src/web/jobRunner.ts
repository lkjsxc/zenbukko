import type { AppConfig } from '../config.js';
import { downloadCommand } from '../commands/download.js';
import { downloadAllCommand } from '../commands/downloadAll.js';
import { ocrMaterialsCommand } from '../services/geminiOcr.js';
import type { Logger } from '../utils/log.js';
import type { JobRecord } from './types.js';
import { booleanFrom, numberFrom, optionalNumberArray, stringFrom } from './requestUtils.js';
import { getEffectiveWebSettings } from './settings.js';

export async function runJob(job: JobRecord, cfg: AppConfig, webDir: string, logger: Logger): Promise<void> {
  const settings = await getEffectiveWebSettings(cfg, webDir);
  if (job.kind === 'ocr-materials') {
    const backend = ocrBackendFrom(job.request.ocrBackend, settings.ocrBackend);
    if (backend === 'gemini') requireGeminiKey(settings.geminiApiKey);
    await ocrMaterialsCommand({
      inputDir: stringFrom(job.request.inputDir, cfg.outputDir),
      backend,
      apiKey: settings.geminiApiKey,
      model: stringFrom(job.request.ocrModel, settings.geminiModel),
      force: booleanFrom(job.request.ocrForce, false),
      mode: ocrModeFrom(job.request.ocrMode, settings.ocrMode),
      serviceTier: ocrTierFrom(job.request.ocrServiceTier, settings.ocrServiceTier),
      retries: numberFrom(job.request.ocrRetries, settings.ocrRetries),
      timeoutMs: numberFrom(job.request.ocrTimeoutMs, settings.ocrTimeoutMs),
      ndlocrCommand: stringFrom(job.request.ndlocrCommand, settings.ndlocrCommand),
      ndlocrDevice: ocrDeviceFrom(job.request.ndlocrDevice, settings.ndlocrDevice),
      ocrPageDpi: numberFrom(job.request.ocrPageDpi, settings.ocrPageDpi),
      ocrKeepIntermediates: booleanFrom(job.request.ocrKeepIntermediates, settings.ocrKeepIntermediates),
      ndlocrEnableTcy: booleanFrom(job.request.ndlocrEnableTcy, settings.ndlocrEnableTcy),
      logger,
    });
    return;
  }

  const backend = ocrBackendFrom(job.request.ocrBackend, settings.ocrBackend);
  if (booleanFrom(job.request.ocrMaterials, false) && backend === 'gemini') requireGeminiKey(settings.geminiApiKey);
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
    ocrBackend: backend,
    ocrModel: stringFrom(job.request.ocrModel, settings.geminiModel),
    ocrForce: booleanFrom(job.request.ocrForce, false),
    ocrMode: ocrModeFrom(job.request.ocrMode, settings.ocrMode),
    ocrServiceTier: ocrTierFrom(job.request.ocrServiceTier, settings.ocrServiceTier),
    ocrRetries: numberFrom(job.request.ocrRetries, settings.ocrRetries),
    ocrTimeoutMs: numberFrom(job.request.ocrTimeoutMs, settings.ocrTimeoutMs),
    ndlocrCommand: stringFrom(job.request.ndlocrCommand, settings.ndlocrCommand),
    ndlocrDevice: ocrDeviceFrom(job.request.ndlocrDevice, settings.ndlocrDevice),
    ocrPageDpi: numberFrom(job.request.ocrPageDpi, settings.ocrPageDpi),
    ocrKeepIntermediates: booleanFrom(job.request.ocrKeepIntermediates, settings.ocrKeepIntermediates),
    ndlocrEnableTcy: booleanFrom(job.request.ndlocrEnableTcy, settings.ndlocrEnableTcy),
    geminiApiKey: settings.geminiApiKey,
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

function ocrModeFrom(value: unknown, fallback: 'auto' | 'batch' | 'flex'): 'auto' | 'batch' | 'flex' {
  return value === 'auto' || value === 'batch' || value === 'flex' ? value : fallback;
}

function ocrTierFrom(value: unknown, fallback: 'flex' | 'standard'): 'flex' | 'standard' {
  return value === 'flex' || value === 'standard' ? value : fallback;
}

function ocrBackendFrom(value: unknown, fallback: 'auto' | 'local' | 'gemini'): 'auto' | 'local' | 'gemini' {
  return value === 'auto' || value === 'local' || value === 'gemini' ? value : fallback;
}

function ocrDeviceFrom(value: unknown, fallback: 'cpu' | 'cuda'): 'cpu' | 'cuda' {
  return value === 'cpu' || value === 'cuda' ? value : fallback;
}

function requireGeminiKey(apiKey: string): void {
  if (!apiKey.trim()) throw new Error('Gemini API key is required before starting OCR. Save it in Gemini Settings or set GEMINI_API_KEY.');
}
