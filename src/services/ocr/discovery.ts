import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists, readTextFileIfExists } from '../../utils/fs.js';
import { resolvePortablePath } from '../../utils/portablePath.js';
import type { MaterialsManifest } from '../materials/types.js';

type WarnLogger = { warn: (message: string) => void };

export async function discoverPdfFiles(inputDir: string, logger?: WarnLogger): Promise<string[]> {
  const fromManifests = await discoverFromMaterialsManifests(inputDir, logger);
  if (fromManifests.length > 0) return fromManifests;
  return discoverRecursivePdfs(inputDir);
}

async function discoverFromMaterialsManifests(inputDir: string, logger?: WarnLogger): Promise<string[]> {
  const manifests = await discoverFilesByName(inputDir, 'materials_manifest.json');
  const pdfs = new Set<string>();
  for (const manifestPath of manifests) {
    const raw = await readTextFileIfExists(manifestPath);
    if (!raw) continue;
    const parsed = parseManifest(raw, manifestPath, logger);
    if (!parsed) continue;
    const baseDir = path.dirname(manifestPath);
    for (const pdfFile of pdfFilesFromMaterialsManifest(parsed)) {
      try {
        const pdfPath = resolvePortablePath(baseDir, pdfFile);
        if (await fileExists(pdfPath)) pdfs.add(pdfPath);
      } catch (error) {
        logger?.warn(`Skipping unsafe manifest PDF path: ${pdfFile} (${error instanceof Error ? error.message : String(error)})`);
      }
    }
  }
  return [...pdfs].sort((a, b) => a.localeCompare(b));
}

export function pdfFilesFromMaterialsManifest(manifest: MaterialsManifest): string[] {
  const pdfs: string[] = [];
  const seen = new Set<string>();
  const referencePdfs = new Set((manifest.referencePages ?? []).map((p) => p.pdfFile).filter((p): p is string => Boolean(p)));
  const hasAssetPdfs = (manifest.assets ?? []).some((a) => a.ocrEligible && a.pdfFile);
  for (const entry of manifest.pdfs ?? []) {
    if (entry.status !== 'ready') continue;
    if (hasAssetPdfs && referencePdfs.has(entry.pdfFile)) continue;
    addPdf(pdfs, seen, entry.pdfFile);
  }
  if (!hasAssetPdfs) {
    for (const page of manifest.referencePages ?? []) {
      if (page.ocrEligible && page.pdfFile) addPdf(pdfs, seen, page.pdfFile);
    }
  }
  for (const asset of manifest.assets ?? []) {
    if (asset.ocrEligible && asset.pdfFile) addPdf(pdfs, seen, asset.pdfFile);
    else if (asset.file.toLowerCase().endsWith('.pdf')) addPdf(pdfs, seen, asset.file);
  }
  return pdfs;
}

function parseManifest(raw: string, manifestPath: string, logger?: WarnLogger): MaterialsManifest | undefined {
  try {
    return JSON.parse(raw) as MaterialsManifest;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger?.warn(`Skipping malformed materials manifest: ${manifestPath} (${message})`);
    return undefined;
  }
}

function addPdf(pdfs: string[], seen: Set<string>, pdfFile: string): void {
  if (seen.has(pdfFile)) return;
  seen.add(pdfFile);
  pdfs.push(pdfFile);
}

async function discoverRecursivePdfs(inputDir: string): Promise<string[]> {
  const all = await walk(inputDir);
  return all.filter((p) => p.toLowerCase().endsWith('.pdf')).sort((a, b) => a.localeCompare(b));
}

async function discoverFilesByName(inputDir: string, name: string): Promise<string[]> {
  const all = await walk(inputDir);
  return all.filter((p) => path.basename(p) === name);
}

async function walk(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...(await walk(p)));
    } else if (entry.isFile()) {
      out.push(p);
    }
  }
  return out;
}
