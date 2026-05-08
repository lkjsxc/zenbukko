import type { Logger } from '../../utils/log.js';
import type { OcrMode, OcrServiceTier } from './plan.js';

export type OcrBackend = 'local' | 'gemini';
export type LocalOcrDevice = 'cpu' | 'cuda';
export type OcrRunMode = 'batch' | 'flex' | 'local';

export type OcrPdfResult = {
  pdfPath: string;
  markdownPath?: string;
  status: 'written' | 'skipped' | 'failed';
  backend: OcrBackend;
  message?: string;
  mode?: OcrRunMode;
  batchJobName?: string;
  artifactDir?: string;
};

export type OcrMaterialsResult = {
  inputDir: string;
  backend: OcrBackend;
  pdfs: string[];
  results: OcrPdfResult[];
  aggregatePath?: string;
  manifestPath: string;
};

export type OcrCommandParams = {
  inputDir: string;
  backend?: OcrBackend;
  force: boolean;
  logger: Logger;
  apiKey?: string;
  model?: string;
  mode?: OcrMode;
  serviceTier?: OcrServiceTier;
  retries?: number;
  timeoutMs?: number;
  ndlocrCommand?: string;
  ndlocrDevice?: LocalOcrDevice;
  ocrPageDpi?: number;
  ocrKeepIntermediates?: boolean;
  ndlocrEnableTcy?: boolean;
};
