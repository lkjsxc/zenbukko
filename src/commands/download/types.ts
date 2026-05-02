import type { Logger } from '../../utils/log.js';

export type DownloadCommandParams = {
  sessionPath: string;
  outputDir: string;
  courseId: number;
  chapters?: number[];
  lessonIds?: number[];
  maxConcurrency: number;
  firstLectureOnly: boolean;
  transcribe: boolean;
  transcribeModel: string;
  transcribeFormat: 'txt' | 'srt' | 'vtt';
  transcribeLanguage?: string;
  noSpeechThreshold?: number;
  maxSeconds?: number;
  materials: boolean;
  deleteMediaAfterTranscribe: boolean;
  ocrMaterials: boolean;
  ocrModel: string;
  ocrForce: boolean;
  geminiApiKey?: string;
  logger: Logger;
};
