import fs from 'node:fs/promises';
import path from 'node:path';
import type { LocalOcrDevice, OcrBackend, OcrPdfResult } from './types.js';

export async function writeOcrManifest(
  inputDir: string,
  manifest: {
    ocrBackend: OcrBackend;
    backend: OcrBackend;
    model?: string;
    requestedMode?: string;
    plannedMode?: string;
    serviceTier?: string;
    localCommand?: string;
    localDevice?: LocalOcrDevice;
    pageDpi?: number;
    ndlocrEnableTcy?: boolean;
    pdfs: string[];
    results: OcrPdfResult[];
    aggregatePath?: string;
  },
): Promise<string> {
  const manifestPath = path.join(inputDir, 'materials_ocr_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...manifest }, null, 2), 'utf8');
  return manifestPath;
}
