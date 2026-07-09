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
  const preview = el('p', { className: 'field-hint chapter-preview', 'aria-live': 'polite' });
  const actions = el('div', { className: 'row chapter-actions' });
  const selectAll = el('button', {
    type: 'button', className: 'btn btn-secondary', text: 'Select all', 'data-chapter-control': 'true',
  });
  const clear = el('button', {
    type: 'button', className: 'btn btn-ghost', text: 'Clear selection', 'data-chapter-control': 'true',
  });
  const grid = el('div', { className: 'chapter-grid' });
  const inputs: Array<{ input: HTMLInputElement; ordinal: number }> = [];

  const update = (notify: boolean): void => {
    const range = ordinalsToRange(selected);
    const ids = selected.map((ordinal) => sorted[ordinal - 1]?.id).filter((id) => id !== undefined);
    const idPreview = ids.length > 12 ? `${ids.slice(0, 12).join(', ')}…` : ids.join(', ');
    preview.textContent = selected.length
      ? `${selected.length} selected · Range ${range} · IDs ${idPreview}`
      : 'No chapter filter — the entire course will be archived.';
    inputs.forEach(({ input, ordinal }) => { input.checked = selected.includes(ordinal); });
    if (notify) onChange({ mode: 'range', chapterRange: range, chapters: '' });
  };

  selectAll.addEventListener('click', () => {
    selected = sorted.map((_, index) => chapterOrdinal(sorted, index));
    update(true);
  });
  clear.addEventListener('click', () => {
    selected = [];
    update(true);
  });
  actions.append(selectAll, clear);

  sorted.forEach((chapter, index) => {
    const ordinal = chapterOrdinal(sorted, index);
    const label = el('label', { className: 'chapter-chip' });
    const input = el('input', {
      type: 'checkbox',
      'data-chapter-control': 'true',
      'aria-label': `Chapter ${ordinal}: ${chapter.title ?? chapter.id}`,
    }) as HTMLInputElement;
    input.checked = selected.includes(ordinal);
    inputs.push({ input, ordinal });
    input.addEventListener('change', () => {
      selected = input.checked
        ? [...selected, ordinal].sort((a, b) => a - b)
        : selected.filter((item) => item !== ordinal);
      update(true);
    });
    label.append(input, el('span', { text: `${ordinal}. ${chapter.title ?? `Chapter ${chapter.id}`}` }));
    grid.append(label);
  });

  const root = el('fieldset', { className: 'chapter-picker' });
  root.append(el('legend', { className: 'field-label', text: 'Chapters' }), actions, grid, preview);
  update(false);
  return root;
};

export const renderChapterTable = (chapters: ChapterItem[]): HTMLElement => {
  const table = el('table', { className: 'data-table' });
  table.innerHTML = `
    <caption class="sr-only">Course chapters</caption>
    <thead><tr><th scope="col">#</th><th scope="col">ID</th><th scope="col">Title</th></tr></thead>`;
  const body = el('tbody');
  chapters.forEach((chapter, index) => {
    const row = el('tr');
    row.innerHTML = `<td>${index + 1}</td><td>${chapter.id}</td><td>${escapeHtml(chapter.title ?? '')}</td>`;
    body.append(row);
  });
  table.append(body);
  return table;
};
