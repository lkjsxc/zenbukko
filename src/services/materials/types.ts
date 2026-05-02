export type MaterialConversionStatus = 'converted' | 'ready' | 'skipped' | 'failed';
export type MaterialPdfKind = 'source-pdf' | 'html' | 'image' | 'text' | 'unsupported';
export type MaterialPdfStatus = 'ready' | 'skipped' | 'failed';

export type PdfFields = {
  pdfFile?: string;
  pdfGenerated?: boolean;
  ocrEligible?: boolean;
  conversionStatus?: MaterialConversionStatus;
  conversionMessage?: string;
};

export type MaterialReferencePage = PdfFields & {
  url: string;
  file: string;
};

export type MaterialAsset = PdfFields & {
  sourcePageUrl: string;
  url: string;
  file: string;
};

export type MaterialPdfEntry = {
  sourceFile: string;
  pdfFile: string;
  kind: Exclude<MaterialPdfKind, 'unsupported'>;
  status: MaterialPdfStatus;
  message?: string;
};

export type MaterialsManifest = {
  generatedAt: string;
  referencePages: MaterialReferencePage[];
  assets: MaterialAsset[];
  pdfs?: MaterialPdfEntry[];
};
