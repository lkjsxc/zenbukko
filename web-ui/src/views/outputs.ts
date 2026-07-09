import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch, downloadUrl } from '../api/client.js';
import { card, loadingState } from '../components/primitives.js';
import { renderOutputExplorer, renderOutputPreview } from '../components/OutputExplorer.js';
import { isPreviewableOutput } from '../utils/outputs.js';
import { el } from '../utils/html.js';

let previewRequestId = 0;

export const renderOutputs = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'split-view' });
  const left = el('section', { className: 'split-pane', 'aria-label': 'Output files' });
  const right = el('section', { className: 'split-pane', 'aria-label': 'Output preview' });

  if (state.loading && state.outputs.length === 0) left.append(loadingState('Loading outputs…'));
  else {
    left.append(renderOutputExplorer(
      state.outputs,
      state.outputFilter,
      state.selectedOutputPath,
      (filter) => dispatch({ type: 'SET_OUTPUT_FILTER', filter }),
      (path) => { void selectOutput(path, dispatch); },
    ));
  }

  const path = state.selectedOutputPath;
  const previewable = path ? isPreviewableOutput(path) : false;
  right.append(renderOutputPreview({
    path,
    content: state.outputPreview?.path === path ? state.outputPreview.content : null,
    status: state.outputPreviewStatus,
    error: state.outputPreviewError,
    downloadHref: path ? downloadUrl(path) : null,
    previewable,
    onRetry: () => { if (path) void selectOutput(path, dispatch); },
  }));

  body.append(left, right);
  return card('Outputs', body);
};

const selectOutput = async (path: string, dispatch: Dispatch): Promise<void> => {
  const requestId = previewRequestId += 1;
  dispatch({ type: 'SELECT_OUTPUT', path });
  if (!isPreviewableOutput(path)) {
    dispatch({ type: 'SET_OUTPUT_PREVIEW_STATUS', status: 'ready' });
    return;
  }
  try {
    const data = await apiFetch<{ content: string }>(`/api/outputs/content?path=${encodeURIComponent(path)}`);
    if (requestId === previewRequestId) dispatch({ type: 'SET_OUTPUT_PREVIEW', preview: { path, content: data.content } });
  } catch (error) {
    if (requestId !== previewRequestId) return;
    const message = error instanceof Error ? error.message : String(error);
    dispatch({ type: 'SET_OUTPUT_PREVIEW_STATUS', status: 'error', error: message });
    dispatch({ type: 'SHOW_TOAST', message: `Preview failed: ${message}`, kind: 'error' });
  }
};
