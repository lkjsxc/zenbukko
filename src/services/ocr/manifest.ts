import path from 'node:path';
import { writeJsonAtomic } from './atomic.js';
import type { LocalOcrPreflight, LocalOcrSettings, OcrPdfResult } from './types.js';

export async function writeOcrManifest(
  inputDir: string,
  manifest: {
    settings: LocalOcrSettings;
    preflight: LocalOcrPreflight;
    pdfs: string[];
    results: OcrPdfResult[];
    aggregatePath?: string;
  },
): Promise<string> {
  const manifestPath = path.join(inputDir, 'materials_ocr_manifest.json');
  await writeJsonAtomic(manifestPath, {
    generatedAt: new Date().toISOString(),
    runner: 'local',
    command: manifest.settings.command,
    device: manifest.settings.device,
    pageDpi: manifest.settings.pageDpi,
    keepIntermediates: manifest.settings.keepIntermediates,
    enableTcy: manifest.settings.enableTcy,
    preflight: manifest.preflight,
    pdfs: manifest.pdfs,
    results: manifest.results,
    ...(manifest.aggregatePath ? { aggregatePath: manifest.aggregatePath } : {}),
  });
  return manifestPath;
}
