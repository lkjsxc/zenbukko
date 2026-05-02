import fs from 'node:fs/promises';
import path from 'node:path';
import { readTextFileIfExists } from '../../utils/fs.js';
import { normalizeMaterialsToPdfs } from './pdf.js';
import type { MaterialsManifest } from './types.js';

type Logger = { info: (message: string) => void; warn: (message: string) => void };

export async function refreshMaterialsPdfsInTree(rootDir: string, logger: Logger): Promise<number> {
  const manifests = await discoverMaterialsManifests(rootDir);
  for (const manifestPath of manifests) {
    await refreshOneManifest(manifestPath, logger);
  }
  return manifests.length;
}

async function refreshOneManifest(manifestPath: string, logger: Logger): Promise<void> {
  const raw = await readTextFileIfExists(manifestPath);
  if (!raw) return;
  try {
    const manifest = JSON.parse(raw) as MaterialsManifest;
    const outDir = path.dirname(manifestPath);
    await normalizeMaterialsToPdfs({ outDir, manifest, logger });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.warn(`Material PDF refresh failed: ${manifestPath} (${message})`);
  }
}

async function discoverMaterialsManifests(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  await walk(rootDir, out);
  return out.sort((a, b) => a.localeCompare(b));
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      await walk(p, out);
    } else if (entry.isFile() && entry.name === 'materials_manifest.json') {
      out.push(p);
    }
  }
}
