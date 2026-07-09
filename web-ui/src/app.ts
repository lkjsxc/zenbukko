import type { AppEvent, AppState, Route } from './state/types.js';
import { initialState, reduce } from './state/store.js';
import { openJobStream, type SseHandle } from './api/sse.js';
import { parseHash, navigate } from './router/hash.js';
import { renderNav, renderStatusSummary, renderToast } from './components/shell.js';
import { appendLogLine } from './components/LogViewer.js';
import { renderDashboard } from './views/dashboard.js';
import { renderSession } from './views/session.js';
import { renderCourses } from './views/courses.js';
import { renderArchive } from './views/archive.js';
import { renderJobs } from './views/jobs.js';
import { renderOutputs } from './views/outputs.js';
import { renderSettings } from './views/settings.js';
import { createLoaders } from './app/loaders.js';
import { el } from './utils/html.js';

export type Dispatch = (event: AppEvent) => void;

let state: AppState = initialState();
let stream: SseHandle | null = null;
let streamJobId: string | null = null;
let jobRefreshTimer: number | null = null;
const toastTimers = new Map<number, number>();

const dispatch: Dispatch = (event) => {
  if (event.type === 'RETRY_CORE') {
    void loaders.refreshCore();
    return;
  }
  if (event.type === 'REFRESH_STATUS') {
    void loaders.refreshStatus();
    return;
  }

  state = reduce(state, event);
  if (event.type === 'APPEND_LOG') {
    const content = document.getElementById('main-content');
    if (content) appendLogLine(content, event.line, state.logPaused);
    return;
  }
  if (event.type === 'SET_COURSE_QUERY') return;
  if (event.type === 'SHOW_TOAST' || event.type === 'DISMISS_TOAST') {
    renderToasts();
    return;
  }
  if (event.type === 'SET_STATUS' || event.type === 'SET_LOADING') renderTopbar();
  if (event.type === 'SET_ROUTE') {
    syncJobStream();
    renderNavigation();
    renderRoute(true);
    return;
  }
  if (affectsRoute(event, state.route)) renderRoute(false);
};

const loaders = createLoaders(dispatch);

const affectsRoute = (event: AppEvent, route: Route): boolean => {
  const type = event.type;
  if (route.name === 'dashboard') return ['SET_LOADING', 'SET_CORE_ERROR', 'SET_STATUS', 'SET_JOBS', 'SET_OUTPUTS'].includes(type);
  if (route.name === 'session') return ['SET_SESSION', 'SET_LOADING'].includes(type);
  if (route.name === 'courses') return ['SET_LOADING', 'SET_STATUS', 'SET_SESSION', 'SET_COURSES', 'SET_COURSES_STATUS', 'SET_COURSE_DETAIL'].includes(type);
  if (route.name === 'archive') return ['SET_LOADING', 'SET_SETTINGS'].includes(type);
  if (route.name === 'jobs') return ['SET_LOADING', 'SET_JOBS', 'SELECT_JOB', 'CLEAR_LOG', 'SET_LOG_PAUSED', 'SET_STREAM_STATUS'].includes(type);
  if (route.name === 'outputs') return ['SET_LOADING', 'SET_OUTPUTS', 'SET_OUTPUT_FILTER', 'SELECT_OUTPUT', 'SET_OUTPUT_PREVIEW', 'SET_OUTPUT_PREVIEW_STATUS'].includes(type);
  return ['SET_LOADING', 'SET_SETTINGS'].includes(type);
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

const mountShell = (): void => {
  const root = document.getElementById('app');
  if (!root) return;
  const shell = el('div', { className: 'app-shell' });
  const header = el('header', { className: 'topbar' });
  header.append(el('a', { className: 'brand', href: '#/', text: 'Zenbukko' }), el('div', { id: 'topbar-status' }));
  const workspace = el('div', { className: 'main' });
  const content = el('main', { className: 'content', id: 'main-content', tabindex: '-1' });
  workspace.append(renderNav(state.route, navigate), content);
  shell.append(header, workspace);
  root.replaceChildren(shell, el('div', { className: 'toast-host', id: 'toast-host', 'aria-label': 'Notifications' }));
  renderTopbar();
};

const renderNavigation = (): void => {
  document.querySelector('.sidebar')?.replaceWith(renderNav(state.route, navigate));
};

const renderTopbar = (): void => {
  document.getElementById('topbar-status')?.replaceChildren(renderStatusSummary(state.status, state.loading));
};

const renderRoute = (focus: boolean): void => {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.replaceChildren(renderView());
  if (focus) requestAnimationFrame(() => content.focus({ preventScroll: true }));
};

const renderToasts = (): void => {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const activeIds = new Set(state.toasts.map((toast) => toast.id));
  for (const [id, timer] of toastTimers) {
    if (!activeIds.has(id)) {
      window.clearTimeout(timer);
      toastTimers.delete(id);
    }
  }
  host.replaceChildren(...state.toasts.map((toast) => {
    if (toast.kind !== 'error' && !toastTimers.has(toast.id)) {
      const timer = window.setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: toast.id }), 5000);
      toastTimers.set(toast.id, timer);
    }
    return renderToast(toast.message, toast.kind, () => dispatch({ type: 'DISMISS_TOAST', id: toast.id }));
  }));
};

const scheduleJobRefresh = (): void => {
  if (jobRefreshTimer !== null) return;
  jobRefreshTimer = window.setTimeout(() => {
    jobRefreshTimer = null;
    void loaders.loadJobs().catch(() => undefined);
  }, 1500);
};

const syncJobStream = (): void => {
  const jobId = state.route.name === 'jobs' ? (state.route.jobId ?? state.selectedJobId) : null;
  if (jobId !== state.selectedJobId) state = reduce(state, { type: 'SELECT_JOB', jobId });
  if (jobId === streamJobId) return;
  stream?.close();
  stream = null;
  streamJobId = jobId;
  state = reduce(state, { type: 'SET_STREAM_STATUS', status: jobId ? 'connecting' : 'idle' });
  if (!jobId) return;
  stream = openJobStream(jobId, {
    onLine: (line) => { dispatch({ type: 'APPEND_LOG', line }); scheduleJobRefresh(); },
    onOpen: () => dispatch({ type: 'SET_STREAM_STATUS', status: 'connected' }),
    onReconnecting: () => dispatch({ type: 'SET_STREAM_STATUS', status: 'reconnecting' }),
  });
};

export const boot = (): void => {
  mountShell();
  let initialized = false;
  const onHash = () => {
    dispatch({ type: 'SET_ROUTE', route: parseHash(window.location.hash) });
    if (initialized) loaders.refreshRoute(state.route);
    else {
      initialized = true;
      void loaders.refreshCore();
    }
  };
  window.addEventListener('hashchange', onHash);
  onHash();
};
