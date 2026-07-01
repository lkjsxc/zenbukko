import path from 'node:path';
import { downloadLessonMaterials } from '../../services/materials.js';
import type { WorkItem } from './lessonItems.js';

export async function downloadAllMaterials(items: WorkItem[]): Promise<string[]> {
  const dirs: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const dir = await handleMaterials(item);
    if (dir && !seen.has(dir)) {
      seen.add(dir);
      dirs.push(dir);
    }
  }
  return dirs;
}

async function handleMaterials(ctx: WorkItem): Promise<string | undefined> {
  const needsSuffix = ctx.item.suffix !== '';
  const pages = ctx.item.referencePageUrls ?? [];
  if (pages.length === 0) {
    ctx.params.logger.warn(`No lesson reference URLs found; skipping materials: ${ctx.lesson.chapterId}/${ctx.lesson.lessonId}${needsSuffix ? ` (part ${ctx.item.index})` : ''}`);
    return undefined;
  }
  const materialsDir = path.join(path.dirname(ctx.outFilePath), `lesson-${ctx.lesson.lessonId}${ctx.item.suffix}_materials`);
  ctx.params.logger.info(`Downloading materials (${pages.length} reference page(s)) to: ${materialsDir}`);
  await downloadLessonMaterials({ referencePageUrls: pages, outDir: materialsDir, headers: ctx.headers, logger: ctx.params.logger });
  return materialsDir;
}
