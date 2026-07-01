import { el } from '../utils/html.js';

export const renderLogViewer = (
  text: string,
  paused: boolean,
  onTogglePause: () => void,
): HTMLElement => {
  const root = el('div', { className: 'log-viewer' });
  const toolbar = el('div', { className: 'log-toolbar' });
  const pauseBtn = el('button', { className: 'btn btn-secondary btn-sm', type: 'button', text: paused ? 'Resume scroll' : 'Pause scroll' });
  pauseBtn.addEventListener('click', onTogglePause);
  toolbar.append(pauseBtn);

  const pre = el('pre', { className: 'log-pre', 'aria-live': 'polite' });
  pre.textContent = text;
  if (!paused) pre.scrollTop = pre.scrollHeight;

  root.append(toolbar, pre);
  return root;
};

export const updateLogText = (root: HTMLElement, text: string, paused: boolean): void => {
  const pre = root.querySelector('.log-pre');
  if (!(pre instanceof HTMLElement)) return;
  pre.textContent = text;
  if (!paused) pre.scrollTop = pre.scrollHeight;
};
