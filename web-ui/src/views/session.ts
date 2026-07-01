import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, field } from '../components/primitives.js';
import { el } from '../utils/html.js';

export const renderSession = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  const notice = el('div', {
    className: `notice ${state.sessionExists ? 'notice-ready' : 'notice-missing'}`,
    text: state.sessionExists
      ? 'Saved session loaded. Course and archive jobs will use it.'
      : 'No saved session. Paste session JSON once, then save.',
  });

  const textarea = el('textarea', { className: 'code-input', spellcheck: 'false' }) as HTMLTextAreaElement;
  textarea.value = state.sessionText;

  const row = el('div', { className: 'row' });
  const saveBtn = button('Save session', { variant: 'primary' });
  const prettyBtn = button('Pretty-print', { variant: 'secondary' });
  const validateBtn = button('Validate JSON', { variant: 'ghost' });

  prettyBtn.addEventListener('click', () => {
    try {
      textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
      dispatch({ type: 'SHOW_TOAST', message: 'Formatted.', kind: 'success' });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    }
  });

  validateBtn.addEventListener('click', () => {
    try {
      JSON.parse(textarea.value);
      dispatch({ type: 'SHOW_TOAST', message: 'Valid JSON.', kind: 'success' });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      JSON.parse(textarea.value);
      saveBtn.disabled = true;
      await apiFetch(state.token, '/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: textarea.value }),
      });
      dispatch({ type: 'SET_SESSION', text: textarea.value, exists: true });
      dispatch({ type: 'SHOW_TOAST', message: 'Session saved.', kind: 'success' });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    } finally {
      saveBtn.disabled = false;
    }
  });

  row.append(saveBtn, prettyBtn, validateBtn);
  body.append(notice, field('Session JSON', textarea), row);
  return card('Session', body);
};
