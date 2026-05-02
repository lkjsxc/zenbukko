import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists, readTextFileIfExists } from '../utils/fs.js';
import type { MaterialsManifest } from './materials/types.js';

export async function discoverPdfFiles(inputDir: string): Promise<string[]> {
  const fromManifests = await discoverFromMaterialsManifests(inputDir);
  if (fromManifests.length > 0) return fromManifests;
  return discoverRecursivePdfs(inputDir);
}

async function discoverFromMaterialsManifests(inputDir: string): Promise<string[]> {
  const manifests = await discoverFilesByName(inputDir, 'materials_manifest.json');
  const pdfs = new Set<string>();
  for (const manifestPath of manifests) {
    const raw = await readTextFileIfExists(manifestPath);
    if (!raw) continue;
    const parsed = JSON.parse(raw) as MaterialsManifest;
    const baseDir = path.dirname(manifestPath);
    for (const pdfFile of pdfFilesFromMaterialsManifest(parsed)) {
      const pdfPath = path.resolve(baseDir, pdfFile);
      if (await fileExists(pdfPath)) pdfs.add(pdfPath);
    }
  }
  return [...pdfs].sort((a, b) => a.localeCompare(b));
}

export function pdfFilesFromMaterialsManifest(manifest: MaterialsManifest): string[] {
  const pdfs = new Set<string>();
  for (const entry of manifest.pdfs ?? []) {
    if (entry.status === 'ready') pdfs.add(entry.pdfFile);
  }
  for (const page of manifest.referencePages ?? []) {
    if (page.ocrEligible && page.pdfFile) pdfs.add(page.pdfFile);
  }
  for (const asset of manifest.assets ?? []) {
    if (asset.ocrEligible && asset.pdfFile) pdfs.add(asset.pdfFile);
    else if (asset.file.toLowerCase().endsWith('.pdf')) pdfs.add(asset.file);
  }
  return [...pdfs].sort((a, b) => a.localeCompare(b));
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
