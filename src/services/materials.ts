import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { ensureDir, safeBasename } from '../utils/fs.js';
import { downloadUrlToFile } from '../downloader/httpFile.js';

const FILE_EXTS = new Set([
  '.pdf',
  '.ppt',
  '.pptx',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.txt',
  '.md',
  // Some lessons expose materials as per-slide images.
  '.png',
  '.jpg',
  '.jpeg',
]);

const IGNORE_EXTS = new Set([
  '.js',
  '.css',
  '.map',
  '.woff',
  '.woff2',
  '.ttf',
  '.svg',
  '.ico',
]);

function extractCandidateUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();

  // Grab obvious href/src URLs.
  const attrRe = /\b(?:href|src)=("|')([^"']+)(\1)/gi;
  for (;;) {
    const m = attrRe.exec(html);
    if (!m) break;
    const v = m[2];
    if (typeof v === 'string' && v) urls.add(v);
  }

  // Also grab any absolute URLs embedded in script JSON.
  const absRe = /https?:\/\/[^\s"'<>]+/g;
  for (;;) {
    const m = absRe.exec(html);
    if (!m) break;
    urls.add(m[0]);
  }

  return [...urls];
}

function isLikelyDownload(urlStr: string): boolean {
  try {
    const u = new URL(urlStr, 'https://www.nnn.ed.nico/');
    const p = u.pathname.toLowerCase();
    const ext = path.extname(p);

    if (IGNORE_EXTS.has(ext)) return false;

    // Slide/page images are often embedded as signed "*-private.png" URLs.
    if (u.hostname === 'cdn-private.nnn.ed.nico' && /-private\.(png|jpe?g)$/i.test(p)) return true;

    if (FILE_EXTS.has(ext)) return true;

    // Some downloadable assets may not have extensions.
    if (p.includes('/drive/') && !p.includes('/drive/kagai/assets/')) return true;
    return false;
  } catch {
    return false;
  }
}

function stableAssetFilename(url: URL): string {
  const ext = path.extname(url.pathname) || '.bin';
  const baseNoExt = path.basename(url.pathname, ext) || 'file';
  const safeBase = safeBasename(baseNoExt);
  const hash = crypto.createHash('sha256').update(url.toString()).digest('hex').slice(0, 16);
  return `${safeBase}_${hash}${ext}`;
}

function legacyAssetFilename(url: URL): string {
  const ext = path.extname(url.pathname);
  const base = path.basename(url.pathname) || 'file';
  const safe = safeBasename(base);
  if (ext) return safe;
  return `${safe}.bin`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type MaterialsManifest = {
  generatedAt: string;
  referencePages: Array<{ url: string; file: string }>; // file is relative to outDir
  assets: Array<{ sourcePageUrl: string; url: string; file: string }>; // file is relative to outDir
};

function renderMaterialsIndexHtml(manifest: MaterialsManifest): string {
  const referenceLinks = manifest.referencePages
    .map((p, i) => {
      const label = `Reference page ${i + 1}`;
      return `<li><a href="${escapeHtml(p.file)}">${escapeHtml(label)}</a> <span class="muted">(${escapeHtml(
        p.url,
      )})</span></li>`;
    })
    .join('\n');

  const images = manifest.assets.filter((a) => /\.(png|jpe?g)$/i.test(a.file));
  const others = manifest.assets.filter((a) => !/\.(png|jpe?g)$/i.test(a.file));

  const imageHtml = images
    .map(
      (a) =>
        `<figure><img src="${escapeHtml(a.file)}" loading="lazy" alt="" /><figcaption class="muted">${escapeHtml(
          a.url,
        )}</figcaption></figure>`,
    )
    .join('\n');

  const otherLinks = others
    .map((a) => {
      const fileName = path.basename(a.file);
      return `<li><a href="${escapeHtml(a.file)}">${escapeHtml(fileName)}</a> <span class="muted">(${escapeHtml(
        a.url,
      )})</span></li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lesson materials</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 16px; line-height: 1.4; }
      h1,h2 { margin: 0.6em 0 0.3em; }
      .muted { color: #666; font-size: 12px; }
      ul { padding-left: 18px; }
      figure { margin: 12px 0; }
      img { max-width: 100%; height: auto; border: 1px solid #eee; }
      code { background: #f6f6f6; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Lesson materials</h1>
    <div class="muted">Generated at ${escapeHtml(manifest.generatedAt)}. Offline-openable.</div>

    <h2>Reference pages</h2>
    <ul>
      ${referenceLinks || '<li class="muted">(none)</li>'}
    </ul>

    <h2>Files</h2>
    <ul>
      ${otherLinks || '<li class="muted">(none)</li>'}
    </ul>

    <h2>Images</h2>
    ${imageHtml || '<div class="muted">(none)</div>'}

    <hr />
    <div class="muted">Manifest: <a href="materials_manifest.json"><code>materials_manifest.json</code></a></div>
  </body>
</html>`;
}

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

  const manifest: MaterialsManifest = {
    generatedAt: new Date().toISOString(),
    referencePages: [],
    assets: [],
  };

  for (const pageUrl of params.referencePageUrls) {
    let html: string;
    try {
      const init: RequestInit = { redirect: 'follow' };
      if (params.headers) init.headers = params.headers;
      const res = await fetch(pageUrl, init);
      if (!res.ok) {
        params.logger.warn(`Materials page fetch failed (HTTP ${res.status}): ${pageUrl}`);
        continue;
      }
      html = await res.text();
    } catch (e) {
      params.logger.warn(`Materials page fetch failed: ${pageUrl} (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }

    // Always save the reference page HTML for offline inspection.
    const pagePath = new URL(pageUrl).pathname;
    const refBase = safeBasename(path.basename(pagePath || 'page'));
    const refOutPath = path.join(params.outDir, `reference_${refBase}.html`);
    await writeTextFile(refOutPath, html);
    savedPages.push(refOutPath);
    manifest.referencePages.push({ url: pageUrl, file: path.relative(params.outDir, refOutPath) });

    const candidates = extractCandidateUrlsFromHtml(html)
      .map((u) => {
        try {
          return new URL(u, pageUrl).toString();
        } catch {
          return null;
        }
      })
      .filter((u): u is string => Boolean(u))
      .filter(isLikelyDownload);

    if (candidates.length === 0) {
      params.logger.warn(`No direct material URLs found on reference page: ${pageUrl}`);
      continue;
    }

    // De-dupe while preserving order.
    const unique = [...new Set(candidates)];

    for (const fileUrlStr of unique) {
      const fileUrl = new URL(fileUrlStr, pageUrl);
      const stablePath = path.join(assetsDir, stableAssetFilename(fileUrl));
      const legacyPath = path.join(params.outDir, legacyAssetFilename(fileUrl));

      const stableExists = await fs
        .stat(stablePath)
        .then((s) => s.isFile() && s.size > 0)
        .catch(() => false);

      const legacyExists = !stableExists
        ? await fs
            .stat(legacyPath)
            .then((s) => s.isFile() && s.size > 0)
            .catch(() => false)
        : false;

      if (stableExists) {
        params.logger.info(`Material already exists, skipping: ${stablePath}`);
        manifest.assets.push({
          sourcePageUrl: pageUrl,
          url: fileUrl.toString(),
          file: path.relative(params.outDir, stablePath),
        });
        continue;
      }

      if (legacyExists) {
        params.logger.info(`Material exists (legacy layout), reusing: ${legacyPath}`);
        manifest.assets.push({
          sourcePageUrl: pageUrl,
          url: fileUrl.toString(),
          file: path.relative(params.outDir, legacyPath),
        });
        continue;
      }

      params.logger.info(`Downloading material: ${fileUrl.toString()} -> ${stablePath}`);
      const dlOpts: { outFilePath: string; headers?: Record<string, string> } = { outFilePath: stablePath };
      if (params.headers) dlOpts.headers = params.headers;
      await downloadUrlToFile(fileUrl, dlOpts);
      downloaded.push(stablePath);
      manifest.assets.push({
        sourcePageUrl: pageUrl,
        url: fileUrl.toString(),
        file: path.relative(params.outDir, stablePath),
      });
    }
  }

  const manifestPath = path.join(params.outDir, 'materials_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const indexHtmlPath = path.join(params.outDir, 'index.html');
  await writeTextFile(indexHtmlPath, renderMaterialsIndexHtml(manifest));

  return { downloaded, savedPages, indexHtmlPath, manifestPath };
}

async function writeTextFile(filePath: string, contents: string): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, contents, 'utf8');
}
