import path from 'node:path';
import type { MaterialsManifest } from './types.js';

export function renderMaterialsIndexHtml(manifest: MaterialsManifest): string {
  const referenceLinks = manifest.referencePages
    .map((p, i) => `<li><a href="${escapeHtml(p.file)}">${escapeHtml(`Reference page ${i + 1}`)}</a> <span class="muted">(${escapeHtml(p.url)})</span></li>`)
    .join('\n');
  const images = manifest.assets.filter((a) => /\.(png|jpe?g)$/i.test(a.file));
  const others = manifest.assets.filter((a) => !/\.(png|jpe?g)$/i.test(a.file));
  const imageHtml = images
    .map((a) => `<figure><img src="${escapeHtml(a.file)}" loading="lazy" alt="" /><figcaption class="muted">${escapeHtml(a.url)}</figcaption></figure>`)
    .join('\n');
  const otherLinks = others
    .map((a) => `<li><a href="${escapeHtml(a.file)}">${escapeHtml(path.basename(a.file))}</a> <span class="muted">(${escapeHtml(a.url)})</span></li>`)
    .join('\n');
  const pdfLinks = (manifest.pdfs ?? [])
    .filter((p) => p.status === 'ready')
    .map((p) => `<li><a href="${escapeHtml(p.pdfFile)}">${escapeHtml(path.basename(p.pdfFile))}</a> <span class="muted">(${escapeHtml(p.sourceFile)})</span></li>`)
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
    <h2>Reference pages</h2><ul>${referenceLinks || '<li class="muted">(none)</li>'}</ul>
    <h2>OCR PDFs</h2><ul>${pdfLinks || '<li class="muted">(none)</li>'}</ul>
    <h2>Files</h2><ul>${otherLinks || '<li class="muted">(none)</li>'}</ul>
    <h2>Images</h2>${imageHtml || '<div class="muted">(none)</div>'}
    <hr /><div class="muted">Manifest: <a href="materials_manifest.json"><code>materials_manifest.json</code></a></div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
