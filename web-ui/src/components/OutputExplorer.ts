import type { LoadStatus, OutputFilter, OutputItem } from '../state/types.js';
import { el, escapeHtml, formatBytes, formatTime } from '../utils/html.js';
import { matchesOutputFilter } from '../utils/outputs.js';
import { emptyState, inlineError, loadingState } from './primitives.js';

const FILTERS: Array<{ value: OutputFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'md', label: 'Markdown' },
  { value: 'transcript', label: 'Transcripts' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
];

export const renderOutputExplorer = (
  outputs: OutputItem[],
  filter: OutputFilter,
  selectedPath: string | null,
  onFilter: (filter: OutputFilter) => void,
  onSelect: (path: string) => void,
): HTMLElement => {
  const root = el('div', { className: 'output-explorer' });
  const chips = el('div', { className: 'filter-chips', 'aria-label': 'Filter outputs' });
  for (const item of FILTERS) {
    const active = filter === item.value;
    const chip = el('button', {
      className: `chip${active ? ' active' : ''}`,
      type: 'button',
      text: item.label,
      'aria-pressed': String(active),
    });
    chip.addEventListener('click', () => onFilter(item.value));
    chips.append(chip);
  }

  const list = el('div', { className: 'output-list', 'aria-label': 'Output files' });
  const filtered = outputs.filter((output) => matchesOutputFilter(output.path, filter));
  if (outputs.length === 0) list.append(emptyState('No outputs yet. Completed jobs will appear here.'));
  else if (filtered.length === 0) list.append(emptyState('No files match this filter.'));
  for (const item of filtered) {
    const selected = item.path === selectedPath;
    const row = el('button', {
      className: `output-row${selected ? ' active' : ''}`,
      type: 'button',
      'aria-pressed': String(selected),
    });
    row.innerHTML = `<span class="output-path">${escapeHtml(item.path)}</span><span class="muted">${formatBytes(item.size)} · ${formatTime(item.updatedAt)}</span>`;
    row.addEventListener('click', () => onSelect(item.path));
    list.append(row);
  }

  root.append(chips, list);
  return root;
};

type PreviewOptions = {
  path: string | null;
  content: string | null;
  status: LoadStatus;
  error: string | null;
  downloadHref: string | null;
  previewable: boolean;
  onRetry: () => void;
};

export const renderOutputPreview = (options: PreviewOptions): HTMLElement => {
  const pane = el('div', { className: 'output-preview', 'aria-busy': String(options.status === 'loading') });
  if (!options.path) {
    pane.append(emptyState('Select a file to preview or download.'));
    return pane;
  }

  pane.append(el('h2', { className: 'preview-title', text: options.path }));
  if (options.downloadHref) {
    const link = el('a', { className: 'btn btn-secondary', href: options.downloadHref, text: 'Download file' });
    link.setAttribute('download', '');
    pane.append(link);
  }
  if (!options.previewable) {
    pane.append(el('p', { className: 'muted', text: 'Preview is unavailable for this file type.' }));
  } else if (options.status === 'loading') {
    pane.append(loadingState('Loading preview…'));
  } else if (options.status === 'error') {
    pane.append(inlineError(options.error ?? 'Preview could not be loaded.', options.onRetry));
  } else if (options.content !== null) {
    const pre = el('pre', { className: 'preview-content', tabindex: '0' });
    pre.textContent = options.content;
    pane.append(pre);
  }
  return pane;
};
