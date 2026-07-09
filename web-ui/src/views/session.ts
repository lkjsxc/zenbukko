import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, field } from '../components/primitives.js';
import { el } from '../utils/html.js';

export const renderSession = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  body.append(el('div', {
    className: `notice ${state.sessionExists ? 'notice-ready' : 'notice-missing'}`,
    text: state.sessionExists
      ? 'Saved session loaded. Course and archive jobs will use it.'
      : 'No saved session. Paste session JSON once, then save.',
  }));

  const textarea = el('textarea', {
    className: 'code-input', spellcheck: 'false', autocomplete: 'off', 'aria-describedby': 'session-error',
  }) as HTMLTextAreaElement;
  textarea.value = state.sessionText;
  const error = el('p', { className: 'field-error', id: 'session-error', 'aria-live': 'polite' });
  const inputField = field('Session JSON', textarea, { hint: 'Paste the exported session JSON. It remains on this device.' });
  const describedBy = textarea.getAttribute('aria-describedby') ?? '';
  textarea.setAttribute('aria-describedby', `${describedBy} session-error`.trim());
  inputField.append(error);

  const row = el('div', { className: 'row' });
  const saveBtn = button('Save session');
  const prettyBtn = button('Pretty-print', { variant: 'secondary' });
  const validateBtn = button('Validate JSON', { variant: 'ghost' });

  const parse = (): unknown => {
    try {
      const value = JSON.parse(textarea.value) as unknown;
      error.textContent = '';
      textarea.removeAttribute('aria-invalid');
      return value;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      error.textContent = message;
      textarea.setAttribute('aria-invalid', 'true');
      throw caught;
    }
  };

  prettyBtn.addEventListener('click', () => {
    try {
      textarea.value = JSON.stringify(parse(), null, 2);
      dispatch({ type: 'SHOW_TOAST', message: 'Session JSON formatted.', kind: 'success' });
    } catch {
      dispatch({ type: 'SHOW_TOAST', message: 'Fix the highlighted JSON error.', kind: 'error' });
    }
  });

  validateBtn.addEventListener('click', () => {
    try {
      parse();
      dispatch({ type: 'SHOW_TOAST', message: 'Session JSON is valid.', kind: 'success' });
    } catch {
      dispatch({ type: 'SHOW_TOAST', message: 'Fix the highlighted JSON error.', kind: 'error' });
    }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      parse();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      saveBtn.setAttribute('aria-busy', 'true');
      await apiFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: textarea.value }),
      });
      dispatch({ type: 'SET_SESSION', text: textarea.value, exists: true });
      dispatch({ type: 'REFRESH_STATUS' });
      dispatch({ type: 'SHOW_TOAST', message: 'Session saved.', kind: 'success' });
    } catch (caught) {
      const message = textarea.hasAttribute('aria-invalid')
        ? 'Fix the highlighted JSON error.'
        : caught instanceof Error ? caught.message : String(caught);
      dispatch({ type: 'SHOW_TOAST', message, kind: 'error' });
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save session';
      saveBtn.removeAttribute('aria-busy');
    }
  });

  row.append(saveBtn, prettyBtn, validateBtn);
  body.append(inputField, row);
  return card('Session', body);
};
