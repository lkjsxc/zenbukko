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
  await downloadCommand({
    ...common,
    courseId,
    ...(chapters ? { chapters } : {}),
    ...(lessonIds ? { lessonIds } : {}),
    firstLectureOnly: booleanFrom(job.request.firstLectureOnly, false),
  });
}
