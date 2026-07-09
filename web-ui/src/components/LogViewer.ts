import type { StreamStatus } from '../state/types.js';
import { el } from '../utils/html.js';
import { emptyState } from './primitives.js';

export const renderLogViewer = (
  text: string,
  paused: boolean,
  status: StreamStatus,
  selectedJobId: string | null,
  onTogglePause: () => void,
): HTMLElement => {
  const root = el('div', { className: 'log-viewer' });
  if (!selectedJobId) {
    root.append(emptyState('Select a job to view its live log.'));
    return root;
  }

  const toolbar = el('div', { className: 'log-toolbar' });
  const pauseBtn = el('button', {
    className: 'btn btn-secondary btn-sm',
    type: 'button',
    text: paused ? 'Resume scroll' : 'Pause scroll',
  });
  pauseBtn.addEventListener('click', onTogglePause);
  toolbar.append(pauseBtn, connectionBanner(status));

  const pre = el('pre', {
    className: 'log-pre',
    role: 'log',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
    'aria-label': `Live log for job ${selectedJobId}`,
  });
  pre.textContent = text;
  root.append(toolbar, pre);
  requestAnimationFrame(() => { if (!paused) pre.scrollTop = pre.scrollHeight; });
  return root;
};

const connectionBanner = (status: StreamStatus): HTMLElement => {
  if (status === 'connected') return el('span', { className: 'stream-status stream-connected', text: 'Live' });
  if (status === 'reconnecting') {
    return el('span', { className: 'stream-status stream-reconnecting', role: 'status', text: 'Reconnecting…' });
  }
  return el('span', { className: 'stream-status', role: 'status', text: 'Connecting…' });
};

export const appendLogLine = (root: ParentNode, line: string, paused: boolean): void => {
  const pre = root.querySelector('.log-pre');
  if (!(pre instanceof HTMLElement)) return;
  pre.append(document.createTextNode(`${line}\n`));
  if (!paused) pre.scrollTop = pre.scrollHeight;
};
