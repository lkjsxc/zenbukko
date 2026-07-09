import type { OutputFilter } from '../state/types.js';

const extension = (path: string): string => path.split('.').pop()?.toLowerCase() ?? '';

export const matchesOutputFilter = (path: string, filter: OutputFilter): boolean => {
  const ext = extension(path);
  if (filter === 'all') return true;
  if (filter === 'md') return ext === 'md';
  if (filter === 'transcript') return ['txt', 'srt', 'vtt'].includes(ext);
  return ext === filter;
};

export const isPreviewableOutput = (path: string): boolean =>
  ['md', 'txt', 'srt', 'vtt', 'json', 'html'].includes(extension(path));
