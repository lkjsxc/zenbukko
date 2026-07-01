import type { AppState } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch, downloadUrl } from '../api/client.js';
import { card } from '../components/primitives.js';
import { renderOutputExplorer, renderOutputPreview, type OutputFilter } from '../components/OutputExplorer.js';
import { el } from '../utils/html.js';

export const renderOutputs = (state: AppState, dispatch: Dispatch): HTMLElement => {
  let filter: OutputFilter = 'all';
  let selectedPath: string | null = state.outputPreview?.path ?? null;

  const body = el('div', { className: 'split-view' });
  const left = el('div', { className: 'split-pane' });
  const right = el('div', { className: 'split-pane' });

  const mount = () => {
    left.replaceChildren(renderOutputExplorer(
      state.outputs,
      filter,
      selectedPath,
      (f) => { filter = f; mount(); },
      async (path) => {
        selectedPath = path;
        try {
          const data = await apiFetch<{ content: string }>(state.token, `/api/outputs/content?path=${encodeURIComponent(path)}`);
          dispatch({ type: 'SET_OUTPUT_PREVIEW', preview: { path, content: data.content } });
        } catch {
          dispatch({ type: 'SET_OUTPUT_PREVIEW', preview: null });
        }
        mount();
      },
    ));
    right.replaceChildren(renderOutputPreview(
      selectedPath,
      state.outputPreview?.path === selectedPath ? state.outputPreview.content : null,
      selectedPath ? downloadUrl(state.token, selectedPath) : null,
    ));
  };

  mount();
  body.append(left, right);
  return card('Outputs', body);
};
