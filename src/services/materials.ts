import path from 'node:path';
import fs from 'node:fs/promises';
import { ensureDir, safeBasename } from '../utils/fs.js';
import { toPortableRelativePath } from '../utils/portablePath.js';
import { fetchWithSafeRedirects } from '../utils/http.js';
import { downloadUrlToFile } from '../downloader/httpFile.js';
import { candidateMaterialUrls, stableAssetFilename } from './materials/assets.js';
import { renderMaterialsIndexHtml } from './materials/indexHtml.js';
import { normalizeMaterialsToPdfs } from './materials/pdf.js';
import type { MaterialsManifest } from './materials/types.js';

export async function downloadLessonMaterials(params: {
  referencePageUrls: string[];
  outDir: string;
  headers?: Record<string, string>;
  logger: { info: (s: string) => void; warn: (s: string) => void };
}): Promise<{ downloaded: string[]; savedPages: string[]; indexHtmlPath: string; manifestPath: string }> {
  await ensureDir(params.outDir);
  const assetsDir = path.join(params.outDir, 'assets');
  await ensureDir(assetsDir);

  const downloaded: string[] = [];
  const savedPages: string[] = [];
  const manifest: MaterialsManifest = { generatedAt: new Date().toISOString(), referencePages: [], assets: [] };

  for (const pageUrl of params.referencePageUrls) {
    const html = await fetchReferencePage(pageUrl, params);
    if (!html) continue;

    const refOutPath = path.join(params.outDir, `reference_${safeBasename(path.basename(new URL(pageUrl).pathname || 'page'))}.html`);
    await fs.writeFile(refOutPath, html, 'utf8');
    savedPages.push(refOutPath);
    manifest.referencePages.push({ url: pageUrl, file: toPortableRelativePath(params.outDir, refOutPath) });

    const candidates = candidateMaterialUrls(html, pageUrl);
    if (candidates.length === 0) {
      params.logger.warn(`No direct material URLs found on reference page: ${pageUrl}`);
      continue;
    }

    for (const fileUrlStr of candidates) {
      const fileUrl = new URL(fileUrlStr, pageUrl);
      const stablePath = path.join(assetsDir, stableAssetFilename(fileUrl));
      if (await hasFile(stablePath)) {
        params.logger.info(`Material exists, reusing: ${stablePath}`);
        addAsset(manifest, pageUrl, fileUrl, params.outDir, stablePath);
        continue;
      }

      params.logger.info(`Downloading material: ${fileUrl.toString()} -> ${stablePath}`);
      const dlOpts: { outFilePath: string; headers?: Record<string, string>; authenticatedOrigin: URL } = {
        outFilePath: stablePath,
        authenticatedOrigin: new URL(pageUrl),
      };
      if (params.headers) dlOpts.headers = params.headers;
      await downloadUrlToFile(fileUrl, dlOpts);
      downloaded.push(stablePath);
      addAsset(manifest, pageUrl, fileUrl, params.outDir, stablePath);
    }
  }

  await normalizeMaterialsToPdfs({ outDir: params.outDir, manifest, logger: params.logger });

  const manifestPath = path.join(params.outDir, 'materials_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  const indexHtmlPath = path.join(params.outDir, 'index.html');
  await fs.writeFile(indexHtmlPath, renderMaterialsIndexHtml(manifest), 'utf8');
  return { downloaded, savedPages, indexHtmlPath, manifestPath };
}

async function fetchReferencePage(
  pageUrl: string,
  params: { headers?: Record<string, string>; logger: { warn: (s: string) => void } },
): Promise<string | undefined> {
  try {
    const url = new URL(pageUrl);
    const res = await fetchWithSafeRedirects(url, {
      ...(params.headers ? { headers: params.headers } : {}),
      authenticatedOrigin: url,
    });
    if (!res.ok) {
      params.logger.warn(`Materials page fetch failed (HTTP ${res.status}): ${pageUrl}`);
      return undefined;
    }
    return await res.text();
  } catch (e) {
    params.logger.warn(`Materials page fetch failed: ${pageUrl} (${e instanceof Error ? e.message : String(e)})`);
    return undefined;
  }
}

async function hasFile(filePath: string): Promise<boolean> {
  return fs
    .stat(filePath)
    .then((s) => s.isFile() && s.size > 0)
    .catch(() => false);
}

function addAsset(manifest: MaterialsManifest, pageUrl: string, fileUrl: URL, outDir: string, filePath: string): void {
  manifest.assets.push({
    sourcePageUrl: pageUrl,
    url: fileUrl.toString(),
    file: toPortableRelativePath(outDir, filePath),
  });
}
