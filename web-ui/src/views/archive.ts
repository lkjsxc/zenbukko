import type { AppState, ChapterItem } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { button, card, emptyState, field, inlineError, loadingState } from '../components/primitives.js';
import { renderChapterPicker, type ChapterPickerValue } from '../components/ChapterPicker.js';
import { el } from '../utils/html.js';
import { navigate } from '../router/hash.js';

const NNN_BASE = 'https://www.nnn.ed.nico/courses/';
let chapterRequestId = 0;

export const renderArchive = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const courseId = state.route.name === 'archive' ? state.route.courseId : undefined;
  const body = el('div', { className: 'stack' });
  if (state.loading && !state.settings) {
    body.append(loadingState('Loading archive settings…'));
    return card('Archive', body);
  }
  const urlInput = el('input', {
    className: 'input', placeholder: `${NNN_BASE}12345`, value: courseId ? `${NNN_BASE}${courseId}` : '',
  }) as HTMLInputElement;
  const concurrency = el('input', { className: 'input', type: 'number', value: '6', min: '1', max: '32' }) as HTMLInputElement;
  const advancedIds = el('input', { className: 'input', placeholder: '101, 205, 309' }) as HTMLInputElement;
  const transcribe = checkbox(false);
  const materials = checkbox(false);
  const ocrMaterials = checkbox(false);
  const cleanup = checkbox(true);
  cleanup.disabled = true;

  let pickerValue: ChapterPickerValue = { mode: 'range', chapterRange: '', chapters: '' };
  const pickerHost = el('div');
  const validation = el('p', { className: 'field-error', role: 'alert', 'aria-live': 'polite' });
  const startBtn = button('Archive entire course');
  const allBtn = button('Download all courses', { variant: 'secondary' });

  const updateStartLabel = (): void => {
    const filtered = advancedIds.value.trim() || pickerValue.chapterRange;
    startBtn.textContent = filtered ? 'Archive selected chapters' : 'Archive entire course';
  };

  const syncChapterMode = (): void => {
    const explicit = advancedIds.value.trim().length > 0;
    pickerValue = explicit
      ? { mode: 'ids', chapterRange: '', chapters: advancedIds.value.trim() }
      : { ...pickerValue, mode: 'range', chapters: '' };
    pickerHost.querySelectorAll<HTMLElement>('[data-chapter-control]').forEach((control) => {
      if ('disabled' in control) (control as HTMLButtonElement | HTMLInputElement).disabled = explicit;
    });
    pickerHost.classList.toggle('is-disabled', explicit);
    updateStartLabel();
  };

  const loadChapters = async (): Promise<void> => {
    const id = courseIdFromUrl(urlInput.value);
    const requestId = chapterRequestId += 1;
    pickerValue = { mode: 'range', chapterRange: '', chapters: '' };
    if (!id) {
      pickerHost.replaceChildren(emptyState(urlInput.value.trim()
        ? 'Enter a learning URL containing /courses/{id}.'
        : 'Enter a course URL to load its chapter picker. Leaving the filter empty archives the entire course.'));
      updateStartLabel();
      return;
    }
    pickerHost.replaceChildren(loadingState('Loading chapters…'));
    try {
      const detail = await apiFetch<{ chapters: ChapterItem[] }>(`/api/courses/${id}`);
      if (requestId !== chapterRequestId) return;
      pickerHost.replaceChildren(renderChapterPicker(detail.chapters, pickerValue, (value) => {
        pickerValue = value;
        updateStartLabel();
      }));
      syncChapterMode();
    } catch (error) {
      if (requestId !== chapterRequestId) return;
      const message = error instanceof Error ? error.message : String(error);
      pickerHost.replaceChildren(inlineError(`Chapters could not be loaded: ${message}`, () => { void loadChapters(); }));
      dispatch({ type: 'SHOW_TOAST', message, kind: 'error' });
    }
  };

  advancedIds.addEventListener('input', syncChapterMode);
  urlInput.addEventListener('change', () => { void loadChapters(); });
  transcribe.addEventListener('change', () => { cleanup.disabled = !transcribe.checked; });
  ocrMaterials.addEventListener('change', () => {
    if (ocrMaterials.checked) materials.checked = true;
    materials.disabled = ocrMaterials.checked;
  });

  const startJob = async (kind: 'download' | 'download-all'): Promise<void> => {
    const error = validate(kind, urlInput.value, concurrency.value, advancedIds.value);
    validation.textContent = error ?? '';
    if (error) {
      dispatch({ type: 'SHOW_TOAST', message: 'Fix the highlighted archive settings.', kind: 'error' });
      return;
    }
    setSubmitting(startBtn, allBtn, kind);
    const explicit = advancedIds.value.trim();
    try {
      const data = await apiFetch<{ job: { id: string } }>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          learningUrl: kind === 'download' ? urlInput.value.trim() : undefined,
          chapterRange: explicit ? '' : pickerValue.chapterRange,
          chapters: explicit,
          maxConcurrency: Number(concurrency.value),
          transcribe: transcribe.checked,
          materials: materials.checked || ocrMaterials.checked,
          ocrMaterials: ocrMaterials.checked,
          deleteMediaAfterTranscribe: transcribe.checked && cleanup.checked,
          ndlocrCommand: state.settings?.ndlocrCommand ?? 'ndlocr-lite',
          ndlocrDevice: state.settings?.ndlocrDevice ?? 'cpu',
          ocrPageDpi: state.settings?.ocrPageDpi ?? 300,
          ocrKeepIntermediates: state.settings?.ocrKeepIntermediates ?? false,
          ndlocrEnableTcy: state.settings?.ndlocrEnableTcy !== false,
        }),
      });
      dispatch({ type: 'SHOW_TOAST', message: 'Job started.', kind: 'success' });
      navigate({ name: 'jobs', jobId: data.job.id });
    } catch (caught) {
      dispatch({ type: 'SHOW_TOAST', message: caught instanceof Error ? caught.message : String(caught), kind: 'error' });
    } finally {
      resetSubmitting(startBtn, allBtn);
      updateStartLabel();
    }
  };

  startBtn.addEventListener('click', () => { void startJob('download'); });
  allBtn.addEventListener('click', () => { void startJob('download-all'); });
  body.append(
    field('Learning page URL', urlInput, { hint: 'Use an NNN course learning URL. Chapters load after the URL changes.' }),
    pickerHost,
    field('Explicit chapter IDs (advanced)', advancedIds, { hint: 'Entering IDs disables the visual chapter selection.' }),
    field('Concurrency', concurrency, { hint: 'Number of simultaneous requests (1–32).' }),
    optionFields(transcribe, materials, ocrMaterials, cleanup),
    validation,
    startBtn,
    bulkAction(allBtn),
  );
  void loadChapters();
  return card('Archive', body);
};

const checkbox = (checked: boolean): HTMLInputElement => {
  const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = checked;
  return input;
};

const optionFields = (...inputs: HTMLInputElement[]): HTMLElement => {
  const labels = ['Transcribe media', 'Download materials', 'Run PDF OCR (includes materials)', 'Delete media after transcript'];
  const root = el('fieldset', { className: 'option-group' });
  root.append(el('legend', { className: 'field-label', text: 'Processing options' }));
  inputs.forEach((input, index) => root.append(el('label', { className: 'check' }, input, document.createTextNode(labels[index]))));
  return root;
};

const bulkAction = (action: HTMLButtonElement): HTMLElement => el('section', { className: 'bulk-action stack' },
  el('h2', { text: 'Bulk archive' }),
  el('p', { className: 'muted', text: 'Starts a job for every enrolled course using the processing options above.' }),
  action,
);

const courseIdFromUrl = (value: string): string | null => value.match(/\/courses\/(\d+)/)?.[1] ?? null;

const validate = (kind: string, url: string, concurrency: string, ids: string): string | null => {
  if (kind === 'download' && !courseIdFromUrl(url)) return 'Enter a valid course learning URL.';
  const amount = Number(concurrency);
  if (!Number.isInteger(amount) || amount < 1 || amount > 32) return 'Concurrency must be a whole number from 1 to 32.';
  if (ids.trim() && !/^\d+(?:\s*,\s*\d+)*$/.test(ids.trim())) return 'Explicit chapter IDs must be positive numbers separated by commas.';
  return null;
};

const setSubmitting = (start: HTMLButtonElement, all: HTMLButtonElement, kind: string): void => {
  start.disabled = true;
  all.disabled = true;
  (kind === 'download' ? start : all).textContent = 'Starting…';
  start.parentElement?.setAttribute('aria-busy', 'true');
};

const resetSubmitting = (start: HTMLButtonElement, all: HTMLButtonElement): void => {
  start.disabled = false;
  all.disabled = false;
  all.textContent = 'Download all courses';
  start.parentElement?.removeAttribute('aria-busy');
};
