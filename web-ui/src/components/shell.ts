import { el } from '../utils/html.js';
import type { ApiStatus, Route, ToastKind } from '../state/types.js';
import { routeToHash } from '../router/hash.js';

const NAV: Array<{ route: Route; label: string }> = [
  { route: { name: 'dashboard' }, label: 'Dashboard' },
  { route: { name: 'session' }, label: 'Session' },
  { route: { name: 'courses' }, label: 'Courses' },
  { route: { name: 'archive' }, label: 'Archive' },
  { route: { name: 'jobs' }, label: 'Jobs' },
  { route: { name: 'outputs' }, label: 'Outputs' },
  { route: { name: 'settings' }, label: 'Settings' },
];

export const renderNav = (active: Route, onNavigate: (route: Route) => void): HTMLElement => {
  const nav = el('nav', { className: 'sidebar', 'aria-label': 'Main navigation' });
  for (const item of NAV) {
    const isActive = item.route.name === active.name;
    const link = el('a', {
      className: `nav-link${isActive ? ' active' : ''}`,
      href: routeToHash(item.route),
      text: item.label,
    });
    if (isActive) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      onNavigate(item.route);
    });
    nav.append(link);
  }
  return nav;
};

export const renderStatusSummary = (status: ApiStatus | null, loading: boolean): HTMLElement => {
  const root = el('div', { className: 'topbar-status', 'aria-live': 'polite' });
  if (!status) {
    root.append(el('span', { className: 'muted', text: loading ? 'Checking readiness…' : 'Readiness unavailable' }));
    return root;
  }
  root.append(
    el('span', {
      className: `pill ${status.sessionExists ? 'pill-success' : 'pill-warning'}`,
      text: status.sessionExists ? 'Session ready' : 'Session missing',
    }),
    el('span', {
      className: `pill ${status.localOcr.ok ? 'pill-success' : 'pill-warning'}`,
      text: status.localOcr.ok ? 'OCR ready' : 'OCR needs setup',
    }),
  );
  return root;
};

export const renderToast = (
  message: string,
  kind: ToastKind,
  onDismiss: () => void,
): HTMLElement => {
  const toast = el('div', { className: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' });
  const close = el('button', {
    className: 'toast-close',
    type: 'button',
    text: '×',
    'aria-label': 'Dismiss notification',
  });
  close.addEventListener('click', onDismiss);
  toast.append(el('span', { text: message }), close);
  return toast;
};
