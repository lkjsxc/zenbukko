import type { Logger } from '../../utils/log.js';

export type LocalOcrDevice = 'cpu' | 'cuda';

export type OcrDiagnosticCode =
  | 'missing-pdftoppm'
  | 'missing-ocr-command'
  | 'pdf-rasterize-failed'
  | 'ocr-command-failed'
  | 'ocr-produced-empty-output'
  | 'pdf-too-large'
  | 'write-failed'
  | 'unexpected-local-ocr-error';

export type OcrDiagnostic = {
  code: OcrDiagnosticCode;
  message: string;
};

export type LocalOcrSettings = {
  command: string;
  device: LocalOcrDevice;
  pageDpi: number;
  keepIntermediates: boolean;
  enableTcy: boolean;
};

export type LocalOcrPreflight = {
  ok: boolean;
  pdftoppmPath?: string;
  ocrCommandPath?: string;
  diagnostics: OcrDiagnostic[];
};

export type OcrPdfResult = {
  pdfPath: string;
  markdownPath?: string;
  status: 'written' | 'skipped' | 'failed';
  message?: string;
  runner?: 'local';
  diagnosticCode?: OcrDiagnosticCode;
  artifactDir?: string;
  pageCount?: number;
  emptyPageCount?: number;
  elapsedMs?: number;
  rawOutputPaths?: string[];
};

export type OcrMaterialsResult = {
  inputDir: string;
  runner: 'local';
  pdfs: string[];
  results: OcrPdfResult[];
  aggregatePath?: string;
  manifestPath: string;
  preflight: LocalOcrPreflight;
};

export type OcrCommandParams = {
  inputDir: string;
  force: boolean;
  logger: Logger;
  ndlocrCommand?: string;
  ndlocrDevice?: LocalOcrDevice;
  ocrPageDpi?: number;
  ocrKeepIntermediates?: boolean;
  ndlocrEnableTcy?: boolean;
};
