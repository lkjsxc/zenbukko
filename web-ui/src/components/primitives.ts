import { el } from '../utils/html.js';

let componentId = 0;
const nextId = (prefix: string): string => `${prefix}-${componentId += 1}`;

export const button = (
  label: string,
  opts: { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: string } = {},
): HTMLButtonElement => {
  const btn = el('button', {
    className: `btn btn-${opts.variant ?? 'primary'}`,
    type: opts.type ?? 'button',
    text: label,
  }) as HTMLButtonElement;
  btn.disabled = Boolean(opts.disabled);
  return btn;
};

export const card = (title: string, body: HTMLElement): HTMLElement => {
  const titleId = nextId('card-title');
  const root = el('section', { className: 'card', 'aria-labelledby': titleId });
  root.append(el('h1', { className: 'card-title', id: titleId, text: title }), body);
  return root;
};

export const statusPill = (label: string, kind: 'success' | 'warning' | 'danger' | 'muted'): HTMLElement =>
  el('span', { className: `pill pill-${kind}`, text: label });

export const emptyState = (message: string): HTMLElement =>
  el('div', { className: 'empty-state', text: message });

export const loadingState = (message: string): HTMLElement =>
  el('div', { className: 'loading-state', role: 'status', text: message });

export const inlineError = (message: string, onRetry?: () => void): HTMLElement => {
  const root = el('div', { className: 'inline-error', role: 'alert' });
  root.append(el('span', { text: message }));
  if (onRetry) {
    const retry = button('Retry', { variant: 'secondary' });
    retry.addEventListener('click', onRetry);
    root.append(retry);
  }
  return root;
};

export const field = (
  label: string,
  input: HTMLElement,
  options: { hint?: string } = {},
): HTMLElement => {
  const wrap = el('div', { className: 'field' });
  const id = input.id || nextId('field');
  input.id = id;
  wrap.append(el('label', { className: 'field-label', for: id, text: label }), input);
  if (options.hint) {
    const hintId = `${id}-hint`;
    input.setAttribute('aria-describedby', hintId);
    wrap.append(el('p', { className: 'field-hint', id: hintId, text: options.hint }));
  }
  return wrap;
};

export const tableScroll = (table: HTMLElement): HTMLElement =>
  el('div', { className: 'table-scroll', tabindex: '0' }, table);
