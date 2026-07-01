import type { AppEvent, AppState } from './state/types.js';
import { initialState, reduce } from './state/store.js';
import { loadWebToken, apiFetch } from './api/client.js';
import { openJobStream, type SseHandle } from './api/sse.js';
import { parseHash, navigate } from './router/hash.js';
import { renderNav, renderAuthGate, renderToast } from './components/shell.js';
import { renderDashboard } from './views/dashboard.js';
import { renderSession } from './views/session.js';
import { renderCourses } from './views/courses.js';
import { renderArchive } from './views/archive.js';
import { renderJobs } from './views/jobs.js';
import { renderOutputs } from './views/outputs.js';
import { renderSettings } from './views/settings.js';
import { el } from './utils/html.js';

export type Dispatch = (event: AppEvent) => void;

let state: AppState = initialState(loadWebToken());
let sse: SseHandle | null = null;
let sseJobId: string | null = null;

const dispatch: Dispatch = (event) => {
  state = reduce(state, event);
  render();
};

const refreshCore = async (): Promise<void> => {
  if (!state.token) return;
  try {
    const [status, jobs, outputs, settings, session] = await Promise.all([
      apiFetch<AppState['status']>(state.token, '/api/status'),
      apiFetch<{ jobs: AppState['jobs'] }>(state.token, '/api/jobs'),
      apiFetch<{ outputs: AppState['outputs'] }>(state.token, '/api/outputs'),
      apiFetch<{ settings: AppState['settings'] }>(state.token, '/api/settings'),
      apiFetch<{ exists: boolean; text?: string }>(state.token, '/api/session'),
    ]);
    dispatch({ type: 'SET_STATUS', status });
    dispatch({ type: 'SET_JOBS', jobs: jobs.jobs });
    dispatch({ type: 'SET_OUTPUTS', outputs: outputs.outputs });
    dispatch({ type: 'SET_SETTINGS', settings: settings.settings });
    dispatch({ type: 'SET_SESSION', text: session.text ?? '', exists: session.exists });
  } catch (e) {
    dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
  }
};

const bindSse = (jobId: string): void => {
  if (sseJobId === jobId) return;
  sse?.close();
  sseJobId = jobId;
  sse = openJobStream(
    state.token,
    jobId,
    (line) => {
      dispatch({ type: 'APPEND_LOG', line });
      void apiFetch<{ jobs: AppState['jobs'] }>(state.token, '/api/jobs')
        .then((d) => dispatch({ type: 'SET_JOBS', jobs: d.jobs }))
        .catch(() => undefined);
    },
    () => dispatch({ type: 'SHOW_TOAST', message: 'Log stream reconnecting…', kind: 'info' }),
  );
};

const renderView = (): HTMLElement => {
  switch (state.route.name) {
    case 'dashboard': return renderDashboard(state, dispatch);
    case 'session': return renderSession(state, dispatch);
    case 'courses': return renderCourses(state, dispatch);
    case 'archive': return renderArchive(state, dispatch);
    case 'jobs': return renderJobs(state, dispatch);
    case 'outputs': return renderOutputs(state, dispatch);
    case 'settings': return renderSettings(state, dispatch);
  }
};

const render = (): void => {
  const root = document.getElementById('app');
  if (!root) return;

  if (!state.token) {
    root.replaceChildren(renderAuthGate());
    return;
  }

  const shell = el('div', { className: 'app-shell' });
  const header = el('header', { className: 'topbar' });
  header.append(el('h1', { className: 'brand', text: 'Zenbukko' }));
  const main = el('main', { className: 'main' });
  main.append(renderNav(state.route, (route) => navigate(route)), el('div', { className: 'content' }, renderView()));
  shell.append(header, main);

  const toastHost = el('div', { className: 'toast-host' });
  if (state.toast) {
    toastHost.append(renderToast(state.toast.message, state.toast.kind, () => dispatch({ type: 'DISMISS_TOAST' })));
  }

  root.replaceChildren(shell, toastHost);
};

const syncJobStream = (): void => {
  const jobId = state.route.name === 'jobs' ? (state.route.jobId ?? state.selectedJobId) : null;
  if (!jobId) {
    sse?.close();
    sse = null;
    sseJobId = null;
    return;
  }
  if (state.selectedJobId !== jobId) {
    state = reduce(state, { type: 'SELECT_JOB', jobId });
    state = reduce(state, { type: 'CLEAR_LOG' });
  }
  bindSse(jobId);
};

export const boot = (): void => {
  const onHash = () => {
    state = reduce(state, { type: 'SET_ROUTE', route: parseHash(window.location.hash) });
    void refreshCore().then(() => {
      syncJobStream();
      render();
    });
  };
  window.addEventListener('hashchange', onHash);
  onHash();
};
