import path from 'node:path';
import crypto from 'node:crypto';
import { safeBasename } from '../../utils/fs.js';
import type { MaterialPdfKind } from './types.js';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg']);
const TEXT_EXTS = new Set(['.txt', '.md']);
const HTML_EXTS = new Set(['.html', '.htm']);

export function classifyMaterialForPdf(file: string): MaterialPdfKind {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf') return 'source-pdf';
  if (HTML_EXTS.has(ext)) return 'html';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (TEXT_EXTS.has(ext)) return 'text';
  return 'unsupported';
}

export function generatedPdfRelativePath(sourceFile: string): string {
  const parsed = path.parse(sourceFile);
  const sourceKey = sourceFile.split(path.sep).join('/');
  const hash = crypto.createHash('sha256').update(sourceKey).digest('hex').slice(0, 10);
  const base = safeBasename(parsed.name || 'material');
  return path.posix.join('pdf', `${base}_${hash}.pdf`);
}

export function supportedPdfKind(kind: MaterialPdfKind): kind is Exclude<MaterialPdfKind, 'unsupported'> {
  return kind !== 'unsupported';
}
