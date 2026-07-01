import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { card, statusPill, button, emptyState } from '../components/primitives.js';
import { el } from '../utils/html.js';
import { navigate } from '../router/hash.js';

export const renderDashboard = (state: AppState, _dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  const status = state.status;
  const pills = el('div', { className: 'pill-row' });
  if (status) {
    const hasWarnings = status.localOcr.diagnostics.length > 0;
    pills.append(
      statusPill(status.sessionExists ? 'Session ready' : 'Session missing', status.sessionExists ? 'success' : 'warning'),
      statusPill(localOcrLabel(status), status.localOcr.ok && !hasWarnings ? 'success' : 'warning'),
      statusPill(`Output: ${status.outputDir}`, 'muted'),
    );
  }

  const actions = el('div', { className: 'row' });
  actions.append(
    button('Import session', { variant: 'secondary' }),
    button('Browse courses', { variant: 'primary' }),
    button('Start archive', { variant: 'primary' }),
  );
  actions.children[0].addEventListener('click', () => navigate({ name: 'session' }));
  actions.children[1].addEventListener('click', () => navigate({ name: 'courses' }));
  actions.children[2].addEventListener('click', () => navigate({ name: 'archive' }));
  body.append(pills, actions, recentJobs(state), recentOutputs(state));
  return card('Dashboard', body);
};

function localOcrLabel(status: NonNullable<AppState['status']>): string {
  const base = `${status.localOcr.command} (${status.localOcr.device})`;
  if (!status.localOcr.ok) return `Local OCR needs setup: ${base}`;
  if (status.localOcr.diagnostics.length > 0) return `Local OCR warning: ${base}`;
  return `Local OCR ready: ${base}`;
}

function recentJobs(state: AppState): HTMLElement {
  const recent = el('div', { className: 'stack' });
  recent.append(el('h3', { text: 'Recent jobs' }));
  if (state.jobs.length === 0) recent.append(emptyState('No jobs yet.'));
  else recent.append(jobList(state));
  return recent;
}

function jobList(state: AppState): HTMLElement {
  const list = el('ul', { className: 'simple-list' });
  for (const job of state.jobs.slice(0, 5)) {
    const li = el('li');
    const link = el('a', { href: `#/jobs/${job.id}`, text: `${job.title} (${job.status})` });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate({ name: 'jobs', jobId: job.id });
    });
    li.append(link);
    list.append(li);
  }
  return list;
}

function recentOutputs(state: AppState): HTMLElement {
  const recent = el('div', { className: 'stack' });
  recent.append(el('h3', { text: 'Recent outputs' }));
  if (state.outputs.length === 0) recent.append(emptyState('No outputs yet.'));
  else {
    const list = el('ul', { className: 'simple-list' });
    for (const o of state.outputs.slice(0, 5)) list.append(el('li', { text: o.path }));
    recent.append(list);
  }
  return recent;
}
