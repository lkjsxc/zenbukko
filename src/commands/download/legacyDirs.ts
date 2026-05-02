import fs from 'node:fs/promises';
import path from 'node:path';

export async function migrateLegacyChapterDir(params: {
  courseDir: string;
  chapterId: number;
  chapterDirName: string;
  logger: { info: (message: string) => void; warn: (message: string) => void };
}): Promise<void> {
  const legacyName = `chapter-${params.chapterId}`;
  const legacyPath = path.join(params.courseDir, legacyName);
  const numericPath = path.join(params.courseDir, params.chapterDirName);
  if (!(await isDir(legacyPath))) return;

  if (!(await isDir(numericPath))) {
    try {
      await fs.rename(legacyPath, numericPath);
      params.logger.info(`Renamed legacy chapter folder: ${legacyName} -> ${params.chapterDirName}`);
      return;
    } catch (e) {
      params.logger.warn(`Failed to rename legacy chapter folder (${legacyName} -> ${params.chapterDirName}); will attempt merge: ${errorMessage(e)}`);
    }
  }

  await fs.mkdir(numericPath, { recursive: true });
  const fullyMoved = await moveDirContentsBestEffort(legacyPath, numericPath);
  if (fullyMoved) {
    await fs.rmdir(legacyPath).catch(() => params.logger.warn(`Legacy chapter folder not empty after merge, leaving in place: ${legacyPath}`));
    params.logger.info(`Merged legacy chapter folder into numeric folder: ${legacyName} -> ${params.chapterDirName}`);
  } else {
    params.logger.warn(`Partially merged legacy chapter folder into numeric folder (some conflicts left behind): ${legacyName} -> ${params.chapterDirName}`);
  }
}

async function moveDirContentsBestEffort(srcDir: string, dstDir: string): Promise<boolean> {
  await fs.mkdir(dstDir, { recursive: true });
  let fullyMoved = true;
  for (const ent of await fs.readdir(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const dst = path.join(dstDir, ent.name);
    if (ent.isDirectory()) {
      const childMoved = (await isDir(dst)) ? await moveDirContentsBestEffort(src, dst) : await renameOrMerge(src, dst);
      if (childMoved) await fs.rmdir(src).catch(() => { fullyMoved = false; });
      else fullyMoved = false;
      continue;
    }
    if (await exists(dst)) fullyMoved = false;
    else await fs.rename(src, dst).catch(() => { fullyMoved = false; });
  }
  return fullyMoved;
}

async function renameOrMerge(src: string, dst: string): Promise<boolean> {
  return fs.rename(src, dst).then(() => true).catch(() => moveDirContentsBestEffort(src, dst));
}

async function isDir(p: string): Promise<boolean> {
  return fs.stat(p).then((s) => s.isDirectory()).catch(() => false);
}

async function exists(p: string): Promise<boolean> {
  return fs.stat(p).then(() => true).catch(() => false);
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
