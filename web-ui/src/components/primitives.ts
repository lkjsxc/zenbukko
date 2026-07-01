import { el } from '../utils/html.js';

export const button = (
  label: string,
  opts: { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: string } = {},
): HTMLButtonElement => {
  const btn = el('button', {
    className: `btn btn-${opts.variant ?? 'primary'}`,
    type: opts.type ?? 'button',
    text: label,
  }) as HTMLButtonElement;
  if (opts.disabled) btn.disabled = true;
  return btn;
};

export const card = (title: string, body: HTMLElement): HTMLElement => {
  const root = el('section', { className: 'card' });
  root.append(el('h2', { className: 'card-title', text: title }), body);
  return root;
};

export const statusPill = (label: string, kind: 'success' | 'warning' | 'danger' | 'muted'): HTMLElement =>
  el('span', { className: `pill pill-${kind}`, text: label });

export const emptyState = (message: string): HTMLElement =>
  el('div', { className: 'empty-state', text: message });

export const field = (label: string, input: HTMLElement): HTMLElement => {
  const wrap = el('div', { className: 'field' });
  const id = input.id || `field-${Math.random().toString(36).slice(2)}`;
  input.id = id;
  wrap.append(el('label', { className: 'field-label', for: id, text: label }), input);
  return wrap;
};
