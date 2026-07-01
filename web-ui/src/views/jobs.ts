import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { card } from '../components/primitives.js';
import { renderJobTable, bindJobTable } from '../components/JobTable.js';
import { renderLogViewer } from '../components/LogViewer.js';
import { el } from '../utils/html.js';

import { navigate } from '../router/hash.js';

export const renderJobs = (state: AppState, _dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'split-view' });
  const left = el('div', { className: 'split-pane' });
  const right = el('div', { className: 'split-pane' });

  const table = renderJobTable(state.jobs, state.selectedJobId);
  bindJobTable(table, (id) => {
    navigate({ name: 'jobs', jobId: id });
  });

  const log = renderLogViewer(state.logText, state.logPaused, () => {
    dispatch({ type: 'SET_LOG_PAUSED', paused: !state.logPaused });
  });

  left.append(table);
  right.append(log);
  body.append(left, right);
  return card('Jobs', body);
};
