import { el } from '../utils/html.js';
import type { Route } from '../state/types.js';
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
  const nav = el('nav', { className: 'sidebar', 'aria-label': 'Main' });
  for (const item of NAV) {
    const isActive = item.route.name === active.name;
    const link = el('a', {
      className: `nav-link${isActive ? ' active' : ''}`,
      href: routeToHash(item.route),
      text: item.label,
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onNavigate(item.route);
    });
    nav.append(link);
  }
  return nav;
};

export const renderToast = (
  message: string,
  kind: string,
  onDismiss: () => void,
): HTMLElement => {
  const toast = el('div', { className: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' });
  toast.append(el('span', { text: message }), el('button', { className: 'toast-close', text: '×' }));
  toast.querySelector('.toast-close')?.addEventListener('click', onDismiss);
  if (kind !== 'error') window.setTimeout(onDismiss, 5000);
  return toast;
};
