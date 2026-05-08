import path from 'node:path';
import crypto from 'node:crypto';
import { safeBasename } from '../../utils/fs.js';

const FILE_EXTS = new Set(['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.txt', '.md', '.png', '.jpg', '.jpeg']);
const IGNORE_EXTS = new Set(['.js', '.css', '.map', '.woff', '.woff2', '.ttf', '.svg', '.ico']);

export function candidateMaterialUrls(html: string, pageUrl: string): string[] {
  return [...new Set(extractCandidateUrlsFromHtml(html).map((u) => toAbsolute(u, pageUrl)).filter((u): u is string => Boolean(u)).filter(isLikelyDownload))];
}

export function stableAssetFilename(url: URL): string {
  const ext = path.extname(url.pathname) || '.bin';
  const baseNoExt = path.basename(url.pathname, ext) || 'file';
  const hash = crypto.createHash('sha256').update(url.toString()).digest('hex').slice(0, 16);
  return `${safeBasename(baseNoExt)}_${hash}${ext}`;
}

function extractCandidateUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const attrRe = /\b(?:href|src)=("|')([^"']+)(\1)/gi;
  for (;;) {
    const m = attrRe.exec(html);
    if (!m) break;
    const v = m[2];
    if (typeof v === 'string' && v) urls.add(v);
  }

  const absRe = /https?:\/\/[^\s"'<>]+/g;
  for (;;) {
    const m = absRe.exec(html);
    if (!m) break;
    urls.add(m[0]);
  }
  return [...urls];
}

function toAbsolute(url: string, base: string): string | undefined {
  try {
    return new URL(url, base).toString();
  } catch {
    return undefined;
  }
}

function isLikelyDownload(urlStr: string): boolean {
  try {
    const u = new URL(urlStr, 'https://www.nnn.ed.nico/');
    const p = u.pathname.toLowerCase();
    const ext = path.extname(p);
    if (IGNORE_EXTS.has(ext)) return false;
    if (u.hostname === 'cdn-private.nnn.ed.nico' && /-private\.(png|jpe?g)$/i.test(p)) return true;
    if (FILE_EXTS.has(ext)) return true;
    return p.includes('/drive/') && !p.includes('/drive/kagai/assets/');
  } catch {
    return false;
  }
}
