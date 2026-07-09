import type { ApiSettings, AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { button, card, field, loadingState } from '../components/primitives.js';
import { el } from '../utils/html.js';

export const renderSettings = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const settings = state.settings ?? {};
  const body = el('div', { className: 'stack' });
  if (state.loading && !state.settings) {
    body.append(loadingState('Loading local OCR settings…'));
    return card('Settings', body);
  }
  const command = el('input', { className: 'input', value: settings.ndlocrCommand ?? 'ndlocr-lite' }) as HTMLInputElement;
  const device = deviceSelect(settings.ndlocrDevice ?? 'cpu');
  const dpi = el('input', {
    className: 'input', type: 'number', min: '72', max: '600', value: String(settings.ocrPageDpi ?? 300),
  }) as HTMLInputElement;
  const keep = checkbox(Boolean(settings.ocrKeepIntermediates));
  const tcy = checkbox(settings.ndlocrEnableTcy !== false);
  const error = el('p', { className: 'field-error', role: 'alert', 'aria-live': 'polite' });

  const advanced = el('details', { className: 'advanced' });
  advanced.append(
    el('summary', { text: 'Advanced local OCR' }),
    el('div', { className: 'stack advanced-body' },
      checkField('Keep intermediate files', 'Useful for OCR troubleshooting but consumes more disk space.', keep),
      checkField('Enable tate-chu-yoko handling', 'Improves short horizontal number runs in vertical Japanese text.', tcy),
    ),
  );

  const save = button('Save settings');
  save.addEventListener('click', async () => {
    const validation = validate(command.value, dpi.value);
    error.textContent = validation ?? '';
    command.toggleAttribute('aria-invalid', validation?.startsWith('OCR command') ?? false);
    dpi.toggleAttribute('aria-invalid', validation?.startsWith('Page DPI') ?? false);
    if (validation) {
      dispatch({ type: 'SHOW_TOAST', message: 'Fix the highlighted OCR setting.', kind: 'error' });
      return;
    }
    save.disabled = true;
    save.textContent = 'Saving…';
    save.setAttribute('aria-busy', 'true');
    try {
      const data = await apiFetch<{ settings: ApiSettings }>('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: {
          ndlocrCommand: command.value.trim(),
          ndlocrDevice: device.value,
          ocrPageDpi: Number(dpi.value),
          ocrKeepIntermediates: keep.checked,
          ndlocrEnableTcy: tcy.checked,
        } }),
      });
      dispatch({ type: 'SET_SETTINGS', settings: data.settings });
      dispatch({ type: 'REFRESH_STATUS' });
      dispatch({ type: 'SHOW_TOAST', message: 'Settings saved.', kind: 'success' });
    } catch (caught) {
      dispatch({ type: 'SHOW_TOAST', message: caught instanceof Error ? caught.message : String(caught), kind: 'error' });
    } finally {
      save.disabled = false;
      save.textContent = 'Save settings';
      save.removeAttribute('aria-busy');
    }
  });

  body.append(
    field('OCR command', command, { hint: 'Local executable or command available to the API process.' }),
    field('OCR device', device, { hint: 'Use CUDA only when the host and container provide NVIDIA runtime support.' }),
    field('Page DPI', dpi, { hint: 'Rasterization quality from 72 to 600 DPI.' }),
    advanced,
    error,
    save,
  );
  return card('Settings', body);
};

const deviceSelect = (value: 'cpu' | 'cuda'): HTMLSelectElement => {
  const select = el('select', { className: 'input' }) as HTMLSelectElement;
  for (const item of ['cpu', 'cuda'] as const) {
    const option = el('option', { value: item, text: item === 'cpu' ? 'CPU' : 'CUDA (NVIDIA GPU)' }) as HTMLOptionElement;
    option.selected = item === value;
    select.append(option);
  }
  return select;
};

const checkbox = (checked: boolean): HTMLInputElement => {
  const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = checked;
  return input;
};

const checkField = (label: string, hint: string, input: HTMLInputElement): HTMLElement => {
  const root = el('label', { className: 'check-field' });
  root.append(input, el('span', {}, el('strong', { text: label }), el('small', { className: 'field-hint', text: hint })));
  return root;
};

const validate = (command: string, dpi: string): string | null => {
  if (!command.trim()) return 'OCR command is required.';
  const amount = Number(dpi);
  if (!Number.isInteger(amount) || amount < 72 || amount > 600) return 'Page DPI must be a whole number from 72 to 600.';
  return null;
};
