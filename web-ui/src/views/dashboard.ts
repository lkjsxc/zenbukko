import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { card, statusPill, button, emptyState, inlineError, loadingState } from '../components/primitives.js';
import { el } from '../utils/html.js';
import { navigate } from '../router/hash.js';

export const renderDashboard = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  if (state.loading && !state.status) body.append(loadingState('Checking system readiness…'));
  if (state.coreError) body.append(inlineError(`Readiness check failed: ${state.coreError}`, () => dispatch({ type: 'RETRY_CORE' })));
  if (state.status) body.append(statusSummary(state), ocrDetails(state));
  body.append(primaryActions(state), recentJobs(state), recentOutputs(state));
  return card('Dashboard', body);
};

const statusSummary = (state: AppState): HTMLElement => {
  const status = state.status;
  const pills = el('div', { className: 'pill-row', 'aria-label': 'System readiness' });
  if (!status) return pills;
  const hasWarnings = status.localOcr.diagnostics.length > 0;
  pills.append(
    statusPill(status.sessionExists ? 'Session ready' : 'Session missing', status.sessionExists ? 'success' : 'warning'),
    statusPill(localOcrLabel(status), status.localOcr.ok && !hasWarnings ? 'success' : 'warning'),
    statusPill(`Output: ${status.outputDir}`, 'muted'),
  );
  return pills;
};

const ocrDetails = (state: AppState): HTMLElement => {
  const diagnostics = state.status?.localOcr.diagnostics ?? [];
  if (diagnostics.length === 0) return el('div');
  const details = el('details', { className: 'advanced' });
  const list = el('ul', { className: 'simple-list' });
  diagnostics.forEach((item) => list.append(el('li', { text: `${item.code}: ${item.message}` })));
  details.append(el('summary', { text: `${diagnostics.length} local OCR diagnostic${diagnostics.length === 1 ? '' : 's'}` }), list);
  return details;
};

const primaryActions = (state: AppState): HTMLElement => {
  const sessionReady = state.status?.sessionExists ?? state.sessionExists;
  const root = el('div', { className: 'stack quick-actions' });
  if (!sessionReady) {
    root.append(el('div', {
      className: 'notice notice-missing',
      text: 'Sign in with zenbukko auth on a native or WSL2 host, or import private session JSON for Docker. Courses and archive jobs stay unavailable until it is saved.',
    }));
  }
  const actions = el('div', { className: 'row' });
  const session = button(sessionReady ? 'Replace session' : 'Set up NNN session', { variant: sessionReady ? 'secondary' : 'primary' });
  const courses = button('Browse courses', { variant: 'primary', disabled: !sessionReady });
  const archive = button('Start archive', { variant: 'primary', disabled: !sessionReady });
  session.addEventListener('click', () => navigate({ name: 'session' }));
  courses.addEventListener('click', () => navigate({ name: 'courses' }));
  archive.addEventListener('click', () => navigate({ name: 'archive' }));
  actions.append(session, courses, archive);
  root.append(actions);
  return root;
};

const localOcrLabel = (status: NonNullable<AppState['status']>): string => {
  const base = `${status.localOcr.command} (${status.localOcr.device})`;
  if (!status.localOcr.ok) return `Local OCR needs setup: ${base}`;
  if (status.localOcr.diagnostics.length > 0) return `Local OCR warning: ${base}`;
  return `Local OCR ready: ${base}`;
};

const recentJobs = (state: AppState): HTMLElement => {
  const recent = el('section', { className: 'stack', 'aria-labelledby': 'recent-jobs-title' });
  recent.append(el('h2', { id: 'recent-jobs-title', text: 'Recent jobs' }));
  if (state.loading && state.jobs.length === 0) recent.append(loadingState('Loading recent jobs…'));
  else if (state.jobs.length === 0) recent.append(emptyState('No jobs yet.'));
  else {
    const list = el('ul', { className: 'simple-list' });
    for (const job of state.jobs.slice(0, 5)) {
      const link = el('a', { href: `#/jobs/${job.id}`, text: job.title });
      link.addEventListener('click', (event) => { event.preventDefault(); navigate({ name: 'jobs', jobId: job.id }); });
      list.append(el('li', {}, link, document.createTextNode(' '), statusPill(job.status, job.status === 'succeeded' ? 'success' : job.status === 'failed' ? 'danger' : 'warning')));
    }
    recent.append(list);
  }
  return recent;
};

const recentOutputs = (state: AppState): HTMLElement => {
  const recent = el('section', { className: 'stack', 'aria-labelledby': 'recent-outputs-title' });
  recent.append(el('h2', { id: 'recent-outputs-title', text: 'Recent outputs' }));
  if (state.loading && state.outputs.length === 0) recent.append(loadingState('Loading recent outputs…'));
  else if (state.outputs.length === 0) recent.append(emptyState('No outputs yet.'));
  else {
    const list = el('ul', { className: 'simple-list' });
    for (const output of state.outputs.slice(0, 5)) {
      const link = el('a', { href: '#/outputs', text: output.path });
      link.addEventListener('click', (event) => { event.preventDefault(); navigate({ name: 'outputs' }); });
      list.append(el('li', {}, link));
    }
    recent.append(list);
  }
  return recent;
};
