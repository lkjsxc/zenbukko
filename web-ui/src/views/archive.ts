import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, field } from '../components/primitives.js';
import { renderChapterPicker, type ChapterPickerValue } from '../components/ChapterPicker.js';
import type { ChapterItem } from '../state/types.js';
import { el } from '../utils/html.js';
import { navigate } from '../router/hash.js';

const NNN_BASE = 'https://www.nnn.ed.nico/courses/';

export const renderArchive = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  const courseId = state.route.name === 'archive' ? state.route.courseId : undefined;

  const urlInput = el('input', {
    className: 'input',
    placeholder: 'https://.../courses/12345',
    value: courseId ? `${NNN_BASE}${courseId}` : '',
  }) as HTMLInputElement;

  const concurrency = el('input', { className: 'input', type: 'number', value: '6', min: '1' }) as HTMLInputElement;
  const transcribe = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const materials = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const ocrMaterials = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const cleanup = el('input', { type: 'checkbox' }) as HTMLInputElement;
  cleanup.checked = true;

  const advancedIds = el('input', { className: 'input', placeholder: 'Explicit chapter IDs (advanced)' }) as HTMLInputElement;
  let pickerValue: ChapterPickerValue = { mode: 'range', chapterRange: '', chapters: '' };
  let pickerHost = el('div');

  const loadChapters = async () => {
    const match = urlInput.value.match(/\/courses\/(\d+)/);
    if (!match) return;
    const detail = await apiFetch<{ courseId: number; title?: string; chapters: ChapterItem[] }>(
      state.token,
      `/api/courses/${match[1]}`,
    );
    pickerHost.replaceChildren(renderChapterPicker(detail.chapters, pickerValue, (v) => { pickerValue = v; }));
  };

  if (courseId) void loadChapters();

  urlInput.addEventListener('change', () => { void loadChapters(); });

  const collectSettings = () => ({
    ocrBackend: state.settings?.ocrBackend ?? 'auto',
    geminiModel: state.settings?.geminiModel ?? 'gemini-3.1-flash-lite',
    ocrMode: state.settings?.ocrMode ?? 'auto',
    ocrServiceTier: state.settings?.ocrServiceTier ?? 'flex',
    ndlocrCommand: state.settings?.ndlocrCommand ?? 'ndlocr-lite',
    ndlocrDevice: state.settings?.ndlocrDevice ?? 'cpu',
    ocrPageDpi: state.settings?.ocrPageDpi ?? 300,
    ocrKeepIntermediates: state.settings?.ocrKeepIntermediates ?? false,
    ndlocrEnableTcy: state.settings?.ndlocrEnableTcy !== false,
  });

  const startJob = async (kind: 'download' | 'download-all') => {
    const useIds = advancedIds.value.trim().length > 0;
    const payload = {
      kind,
      learningUrl: kind === 'download' ? urlInput.value : undefined,
      chapterRange: useIds ? '' : pickerValue.chapterRange,
      chapters: useIds ? advancedIds.value : '',
      maxConcurrency: Number(concurrency.value || 6),
      transcribe: transcribe.checked,
      materials: materials.checked,
      ocrMaterials: ocrMaterials.checked,
      deleteMediaAfterTranscribe: cleanup.checked,
      ...collectSettings(),
    };
    if (kind === 'download' && !urlInput.value.trim()) {
      dispatch({ type: 'SHOW_TOAST', message: 'Learning URL is required.', kind: 'error' });
      return;
    }
    try {
      const data = await apiFetch<{ job: { id: string } }>(state.token, '/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      dispatch({ type: 'SHOW_TOAST', message: 'Job started.', kind: 'success' });
      navigate({ name: 'jobs', jobId: data.job.id });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    }
  };

  const row = el('div', { className: 'row' });
  const startBtn = button('Start study job', { variant: 'primary' });
  const allBtn = button('Download all courses', { variant: 'secondary' });
  startBtn.addEventListener('click', () => { void startJob('download'); });
  allBtn.addEventListener('click', () => { void startJob('download-all'); });
  row.append(startBtn, allBtn);

  const checks = el('div', { className: 'check-row' });
  for (const [label, input] of [
    ['Transcribe', transcribe],
    ['Materials', materials],
    ['PDF OCR', ocrMaterials],
    ['Delete media after transcript', cleanup],
  ] as const) {
    const lbl = el('label', { className: 'check' });
    lbl.append(input, document.createTextNode(label));
    checks.append(lbl);
  }

  body.append(
    field('Learning page URL', urlInput),
    pickerHost,
    field('Concurrency', concurrency),
    checks,
    field('Explicit chapter IDs (advanced)', advancedIds),
    row,
  );

  return card('Archive', body);
};
