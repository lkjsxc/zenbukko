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
    pills.append(
      statusPill(status.sessionExists ? 'Session ready' : 'Session missing', status.sessionExists ? 'success' : 'warning'),
      statusPill(status.geminiConfigured ? 'Gemini configured' : 'Gemini missing', status.geminiConfigured ? 'success' : 'warning'),
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

  body.append(pills, actions);

  const recentJobs = el('div', { className: 'stack' });
  recentJobs.append(el('h3', { text: 'Recent jobs' }));
  if (state.jobs.length === 0) recentJobs.append(emptyState('No jobs yet.'));
  else {
    const list = el('ul', { className: 'simple-list' });
    for (const job of state.jobs.slice(0, 5)) {
      const li = el('li');
      const link = el('a', { href: `#/jobs/${job.id}`, text: `${job.title} (${job.status})` });
      link.addEventListener('click', (e) => { e.preventDefault(); navigate({ name: 'jobs', jobId: job.id }); });
      li.append(link);
      list.append(li);
    }
    recentJobs.append(list);
  }

  const recentOutputs = el('div', { className: 'stack' });
  recentOutputs.append(el('h3', { text: 'Recent outputs' }));
  if (state.outputs.length === 0) recentOutputs.append(emptyState('No outputs yet.'));
  else {
    const list = el('ul', { className: 'simple-list' });
    for (const o of state.outputs.slice(0, 5)) list.append(el('li', { text: o.path }));
    recentOutputs.append(list);
  }

  body.append(recentJobs, recentOutputs);
  return card('Dashboard', body);
};
