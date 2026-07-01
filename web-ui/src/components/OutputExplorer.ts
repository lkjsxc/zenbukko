import type { OutputItem } from '../state/types.js';
import { el, escapeHtml, formatBytes, formatTime } from '../utils/html.js';

export type OutputFilter = 'all' | 'md' | 'transcript' | 'pdf' | 'json' | 'html';

const matchesFilter = (path: string, filter: OutputFilter): boolean => {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (filter === 'all') return true;
  if (filter === 'md') return ext === 'md';
  if (filter === 'transcript') return ext === 'txt' || ext === 'srt' || ext === 'vtt';
  if (filter === 'pdf') return ext === 'pdf';
  if (filter === 'json') return ext === 'json';
  if (filter === 'html') return ext === 'html';
  return true;
};

export const renderOutputExplorer = (
  outputs: OutputItem[],
  filter: OutputFilter,
  selectedPath: string | null,
  onFilter: (f: OutputFilter) => void,
  onSelect: (path: string) => void,
): HTMLElement => {
  const root = el('div', { className: 'output-explorer' });
  const chips = el('div', { className: 'filter-chips' });
  const filters: OutputFilter[] = ['all', 'md', 'transcript', 'pdf', 'json', 'html'];
  for (const f of filters) {
    const chip = el('button', {
      className: `chip${filter === f ? ' active' : ''}`,
      type: 'button',
      text: f,
    });
    chip.addEventListener('click', () => onFilter(f));
    chips.append(chip);
  }

  const list = el('div', { className: 'output-list' });
  const filtered = outputs.filter((o) => matchesFilter(o.path, filter));
  for (const item of filtered) {
    const row = el('button', {
      className: `output-row${item.path === selectedPath ? ' active' : ''}`,
      type: 'button',
      'data-action': 'select-output',
      'data-path': item.path,
    });
    row.innerHTML = `<span class="output-path">${escapeHtml(item.path)}</span><span class="muted">${formatBytes(item.size)} · ${formatTime(item.updatedAt)}</span>`;
    row.addEventListener('click', () => onSelect(item.path));
    list.append(row);
  }

  root.append(chips, list);
  return root;
};

export const renderOutputPreview = (
  path: string | null,
  content: string | null,
  downloadHref: string | null,
): HTMLElement => {
  const pane = el('div', { className: 'output-preview' });
  if (!path) {
    pane.append(el('p', { className: 'muted', text: 'Select a file to preview.' }));
    return pane;
  }
  pane.append(el('h3', { className: 'preview-title', text: path }));
  if (content !== null) {
    const pre = el('pre', { className: 'preview-content' });
    pre.textContent = content;
    pane.append(pre);
  } else if (downloadHref) {
    const link = el('a', { className: 'btn btn-primary', href: downloadHref, text: 'Download file' });
    link.setAttribute('download', '');
    pane.append(el('p', { className: 'muted', text: 'Binary file — download to view.' }), link);
  }
  return pane;
};
