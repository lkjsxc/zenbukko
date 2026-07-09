import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { card, emptyState, loadingState, tableScroll } from '../components/primitives.js';
import { renderJobTable, bindJobTable } from '../components/JobTable.js';
import { renderLogViewer } from '../components/LogViewer.js';
import { el } from '../utils/html.js';
import { navigate } from '../router/hash.js';

export const renderJobs = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'split-view' });
  const left = el('section', { className: 'split-pane stack', 'aria-label': 'Jobs list' });
  const right = el('section', { className: 'split-pane', 'aria-label': 'Selected job log' });

  if (state.loading && state.jobs.length === 0) {
    left.append(loadingState('Loading jobs…'));
  } else if (state.jobs.length === 0) {
    left.append(emptyState('No jobs yet. Start an archive job to monitor it here.'));
  } else {
    const table = renderJobTable(state.jobs, state.selectedJobId);
    bindJobTable(table, (id) => navigate({ name: 'jobs', jobId: id }));
    left.append(tableScroll(table));
  }

  right.append(renderLogViewer(
    state.logText,
    state.logPaused,
    state.streamStatus,
    state.selectedJobId,
    () => dispatch({ type: 'SET_LOG_PAUSED', paused: !state.logPaused }),
  ));
  body.append(left, right);
  return card('Jobs', body);
};
