import type { AppConfig } from '../config.js';
import { downloadCommand } from '../commands/download.js';
import { downloadAllCommand } from '../commands/downloadAll.js';
import { ocrMaterialsCommand } from '../services/geminiOcr.js';
import type { Logger } from '../utils/log.js';
import type { JobRecord } from './types.js';
import { booleanFrom, numberFrom, optionalNumberArray, stringFrom } from './requestUtils.js';

export async function runJob(job: JobRecord, cfg: AppConfig, logger: Logger): Promise<void> {
  if (job.kind === 'ocr-materials') {
    await ocrMaterialsCommand({
      inputDir: stringFrom(job.request.inputDir, cfg.outputDir),
      ...(cfg.geminiApiKey ? { apiKey: cfg.geminiApiKey } : {}),
      model: stringFrom(job.request.ocrModel, cfg.geminiModel),
      force: booleanFrom(job.request.ocrForce, false),
      mode: ocrModeFrom(job.request.ocrMode, cfg.ocrMode),
      serviceTier: ocrTierFrom(job.request.ocrServiceTier, cfg.ocrServiceTier),
      retries: numberFrom(job.request.ocrRetries, cfg.ocrRetries),
      timeoutMs: numberFrom(job.request.ocrTimeoutMs, cfg.ocrTimeoutMs),
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
    ocrModel: stringFrom(job.request.ocrModel, cfg.geminiModel),
    ocrForce: booleanFrom(job.request.ocrForce, false),
    ocrMode: ocrModeFrom(job.request.ocrMode, cfg.ocrMode),
    ocrServiceTier: ocrTierFrom(job.request.ocrServiceTier, cfg.ocrServiceTier),
    ocrRetries: numberFrom(job.request.ocrRetries, cfg.ocrRetries),
    ocrTimeoutMs: numberFrom(job.request.ocrTimeoutMs, cfg.ocrTimeoutMs),
    ...(cfg.geminiApiKey ? { geminiApiKey: cfg.geminiApiKey } : {}),
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
