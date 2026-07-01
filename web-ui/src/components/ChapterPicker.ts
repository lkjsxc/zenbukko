import type { ChapterItem } from '../state/types.js';
import { el, escapeHtml } from '../utils/html.js';
import { chapterOrdinal, ordinalsToRange, rangeToOrdinals } from '../utils/chapterRange.js';

export type ChapterPickerValue = {
  mode: 'range' | 'ids';
  chapterRange: string;
  chapters: string;
};

export const renderChapterPicker = (
  chapters: ChapterItem[],
  value: ChapterPickerValue,
  onChange: (next: ChapterPickerValue) => void,
): HTMLElement => {
  const sorted = [...chapters].sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
  let selected = value.mode === 'range' ? rangeToOrdinals(value.chapterRange) : [];

  const preview = el('p', { className: 'muted chapter-preview' });
  const grid = el('div', { className: 'chapter-grid' });

  const updatePreview = () => {
    const range = ordinalsToRange(selected);
    const ids = selected.map((o) => sorted[o - 1]?.id).filter((n) => n !== undefined);
    preview.textContent = selected.length
      ? `Selected ordinals: ${range} | IDs: ${ids.join(', ')}`
      : 'No chapters selected';
    onChange({ mode: 'range', chapterRange: range, chapters: '' });
  };

  sorted.forEach((ch, index) => {
    const ordinal = chapterOrdinal(sorted, index);
    const id = `ch-${ch.id}`;
    const label = el('label', { className: 'chapter-chip' });
    const input = el('input', { type: 'checkbox', id }) as HTMLInputElement;
    input.checked = selected.includes(ordinal);
    input.addEventListener('change', () => {
      selected = input.checked
        ? [...selected, ordinal].sort((a, b) => a - b)
        : selected.filter((n) => n !== ordinal);
      updatePreview();
    });
    label.append(input, el('span', { text: `${ordinal}. ${ch.title ?? `Chapter ${ch.id}`}` }));
    grid.append(label);
  });

  const root = el('div', { className: 'chapter-picker' });
  root.append(grid, preview);
  updatePreview();
  return root;
};

export const renderChapterTable = (chapters: ChapterItem[]): HTMLElement => {
  const table = el('table', { className: 'data-table' });
  table.innerHTML = `<thead><tr><th>#</th><th>ID</th><th>Title</th></tr></thead>`;
  const body = el('tbody');
  chapters.forEach((ch, i) => {
    const row = el('tr');
    row.innerHTML = `<td>${i + 1}</td><td>${ch.id}</td><td>${escapeHtml(ch.title ?? '')}</td>`;
    body.append(row);
  });
  table.append(body);
  return table;
};
