import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, field } from '../components/primitives.js';
import { el } from '../utils/html.js';

export const renderSettings = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const s = state.settings ?? {};
  const body = el('div', { className: 'stack' });

  const backend = el('select', { className: 'input' }) as HTMLSelectElement;
  for (const v of ['auto', 'local', 'gemini']) {
    const opt = el('option', { value: v, text: v }) as HTMLOptionElement;
    if (v === (s.ocrBackend ?? 'auto')) opt.selected = true;
    backend.append(opt);
  }

  const apiKey = el('input', { className: 'input', type: 'password', autocomplete: 'off', value: s.geminiApiKey ?? '' }) as HTMLInputElement;
  const model = el('input', { className: 'input', value: s.geminiModel ?? 'gemini-3.1-flash-lite' }) as HTMLInputElement;
  const ocrMode = el('select', { className: 'input' }) as HTMLSelectElement;
  for (const v of ['auto', 'batch', 'flex']) {
    const opt = el('option', { value: v, text: v }) as HTMLOptionElement;
    if (v === (s.ocrMode ?? 'auto')) opt.selected = true;
    ocrMode.append(opt);
  }

  const advanced = el('details', { className: 'advanced' });
  const ndlocrCmd = el('input', { className: 'input', value: s.ndlocrCommand ?? 'ndlocr-lite' }) as HTMLInputElement;
  const device = el('select', { className: 'input' }) as HTMLSelectElement;
  for (const v of ['cpu', 'cuda']) {
    const opt = el('option', { value: v, text: v }) as HTMLOptionElement;
    if (v === (s.ndlocrDevice ?? 'cpu')) opt.selected = true;
    device.append(opt);
  }
  const dpi = el('input', { className: 'input', type: 'number', value: String(s.ocrPageDpi ?? 300) }) as HTMLInputElement;
  const keep = el('input', { type: 'checkbox' }) as HTMLInputElement;
  keep.checked = Boolean(s.ocrKeepIntermediates);
  const tcy = el('input', { type: 'checkbox' }) as HTMLInputElement;
  tcy.checked = s.ndlocrEnableTcy !== false;

  const advBody = el('div', { className: 'stack' });
  advBody.append(field('NDLOCR command', ndlocrCmd), field('NDLOCR device', device), field('Page DPI', dpi));
  advanced.append(el('summary', { text: 'Advanced' }), advBody);

  const saveBtn = button('Save settings', { variant: 'primary' });
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      const data = await apiFetch<{ settings: AppState['settings'] }>(state.token, '/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ocrBackend: backend.value,
            geminiApiKey: apiKey.value,
            geminiModel: model.value,
            ocrMode: ocrMode.value,
            ocrServiceTier: s.ocrServiceTier ?? 'flex',
            ndlocrCommand: ndlocrCmd.value,
            ndlocrDevice: device.value,
            ocrPageDpi: Number(dpi.value || 300),
            ocrKeepIntermediates: keep.checked,
            ndlocrEnableTcy: tcy.checked,
          },
        }),
      });
      dispatch({ type: 'SET_SETTINGS', settings: data.settings });
      dispatch({ type: 'SHOW_TOAST', message: 'Settings saved.', kind: 'success' });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    } finally {
      saveBtn.disabled = false;
    }
  });

  body.append(
    field('OCR backend', backend),
    field('Gemini API key', apiKey),
    field('Gemini model', model),
    field('OCR mode', ocrMode),
    advanced,
    saveBtn,
  );
  return card('Settings', body);
};
