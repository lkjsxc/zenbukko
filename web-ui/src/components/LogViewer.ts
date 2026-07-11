import type { StreamStatus } from '../state/types.js';
import { el } from '../utils/html.js';
import { retainLogText } from '../utils/logText.js';
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
  const retainedText = retainLogText(text);
  pre.append(document.createTextNode(retainedText));
  pre.dataset.logLength = String(retainedText.length);
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

export const appendLogLine = (root: ParentNode, line: string, text: string, paused: boolean): void => {
  const pre = root.querySelector('.log-pre');
  if (!(pre instanceof HTMLElement)) return;
  const appended = `${line}\n`;
  const renderedLength = Number(pre.dataset.logLength ?? '0');
  const textNode = pre.firstChild;
  if (text.length === renderedLength + appended.length && textNode instanceof Text && pre.childNodes.length === 1) {
    textNode.appendData(appended);
  } else {
    pre.textContent = text;
  }
  pre.dataset.logLength = String(text.length);
  if (!paused) pre.scrollTop = pre.scrollHeight;
};
