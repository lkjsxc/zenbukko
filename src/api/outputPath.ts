import fs from 'node:fs/promises';
import path from 'node:path';
import { assertPathInside, resolvePortablePath, toPortableRelativePath } from '../utils/portablePath.js';

export function resolveOutputFile(outputDir: string, relative: string): string {
  return resolvePortablePath(outputDir, relative);
}

export async function resolveExistingOutputFile(outputDir: string, relative: string): Promise<string> {
  const root = path.resolve(outputDir);
  const resolved = resolveOutputFile(root, relative);
  const [realRoot, realFile] = await Promise.all([fs.realpath(root), fs.realpath(resolved)]);
  assertPathInside(realRoot, realFile);
  const stat = await fs.stat(realFile);
  if (!stat.isFile()) throw new Error('Output path is not a file.');
  return realFile;
}

export function relativeOutputPath(outputDir: string, absolute: string): string {
  return toPortableRelativePath(outputDir, absolute);
}
