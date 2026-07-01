import type { LocalOcrDevice } from '../../config.js';
import type { Logger } from '../../utils/log.js';

export type DownloadCommandParams = {
  sessionPath: string;
  outputDir: string;
  courseId: number;
  chapters?: number[];
  chapterRange?: string;
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
  ocrForce: boolean;
  ndlocrCommand: string;
  ndlocrDevice: LocalOcrDevice;
  ocrPageDpi: number;
  ocrKeepIntermediates: boolean;
  ndlocrEnableTcy: boolean;
  logger: Logger;
};
