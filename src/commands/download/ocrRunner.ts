import { rebuildChapterOcr } from '../../services/chapterOcr.js';
import { ocrMaterialsCommand } from '../../services/ocr/index.js';
import type { DownloadCommandParams } from './types.js';

export async function ocrAllMaterials(params: DownloadCommandParams, materialsDirs: string[], courseDir: string): Promise<void> {
  for (const materialsDir of materialsDirs) {
    await ocrMaterialsCommand({
      inputDir: materialsDir,
      force: params.ocrForce,
      ndlocrCommand: params.ndlocrCommand,
      ndlocrDevice: params.ndlocrDevice,
      ocrPageDpi: params.ocrPageDpi,
      ocrKeepIntermediates: params.ocrKeepIntermediates,
      ndlocrEnableTcy: params.ndlocrEnableTcy,
      logger: params.logger,
    });
  }
  await rebuildChapterOcr({ inputDir: courseDir, logger: params.logger });
}
