import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, field } from '../components/primitives.js';
import { el } from '../utils/html.js';

export const renderSettings = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const s = state.settings ?? {};
  const body = el('div', { className: 'stack' });
  const command = el('input', { className: 'input', value: s.ndlocrCommand ?? 'ndlocr-lite' }) as HTMLInputElement;
  const device = deviceSelect(s.ndlocrDevice ?? 'cpu');
  const dpi = el('input', { className: 'input', type: 'number', min: '72', max: '600', value: String(s.ocrPageDpi ?? 300) }) as HTMLInputElement;
  const keep = checkbox(Boolean(s.ocrKeepIntermediates));
  const tcy = checkbox(s.ndlocrEnableTcy !== false);
  const advanced = el('details', { className: 'advanced' });
  advanced.append(
    el('summary', { text: 'Advanced local OCR' }),
    el('div', { className: 'stack' }, field('Keep intermediate files', keep), field('Enable tate-chu-yoko handling', tcy)),
  );

  const saveBtn = button('Save settings', { variant: 'primary' });
  saveBtn.addEventListener('click', () => {
    void saveSettings(state, dispatch, saveBtn, {
      ndlocrCommand: command.value,
      ndlocrDevice: device.value as 'cpu' | 'cuda',
      ocrPageDpi: Number(dpi.value || 300),
      ocrKeepIntermediates: keep.checked,
      ndlocrEnableTcy: tcy.checked,
    });
  });

  body.append(field('OCR command', command), field('OCR device', device), field('Page DPI', dpi), advanced, saveBtn);
  return card('Settings', body);
};

function deviceSelect(value: 'cpu' | 'cuda'): HTMLSelectElement {
  const select = el('select', { className: 'input' }) as HTMLSelectElement;
  for (const v of ['cpu', 'cuda'] as const) {
    const opt = el('option', { value: v, text: v }) as HTMLOptionElement;
    if (v === value) opt.selected = true;
    select.append(opt);
  }
  return select;
}

function checkbox(checked: boolean): HTMLInputElement {
  const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = checked;
  return input;
}

async function saveSettings(state: AppState, dispatch: Dispatch, saveBtn: HTMLButtonElement, settings: AppState['settings']): Promise<void> {
  saveBtn.disabled = true;
  try {
    const data = await apiFetch<{ settings: AppState['settings'] }>(state.token, '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    dispatch({ type: 'SET_SETTINGS', settings: data.settings });
    dispatch({ type: 'SHOW_TOAST', message: 'Settings saved.', kind: 'success' });
  } catch (e) {
    dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
  } finally {
    saveBtn.disabled = false;
  }
}
