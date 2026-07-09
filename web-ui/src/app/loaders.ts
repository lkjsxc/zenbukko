import { apiFetch } from '../api/client.js';
import type { ApiSettings, ApiStatus, AppEvent, AppState, Route } from '../state/types.js';

export type LoaderDispatch = (event: AppEvent) => void;
export type Loaders = ReturnType<typeof createLoaders>;

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const createLoaders = (dispatch: LoaderDispatch) => {
  const loadStatus = async (): Promise<void> => {
    const status = await apiFetch<ApiStatus>('/api/status');
    dispatch({ type: 'SET_STATUS', status });
  };
  const loadJobs = async (): Promise<void> => {
    const data = await apiFetch<{ jobs: AppState['jobs'] }>('/api/jobs');
    dispatch({ type: 'SET_JOBS', jobs: data.jobs });
  };
  const loadOutputs = async (): Promise<void> => {
    const data = await apiFetch<{ outputs: AppState['outputs'] }>('/api/outputs');
    dispatch({ type: 'SET_OUTPUTS', outputs: data.outputs });
  };
  const loadSettings = async (): Promise<void> => {
    const data = await apiFetch<{ settings: ApiSettings | null }>('/api/settings');
    dispatch({ type: 'SET_SETTINGS', settings: data.settings });
  };
  const loadSession = async (): Promise<void> => {
    const data = await apiFetch<{ exists: boolean; text?: string }>('/api/session');
    dispatch({ type: 'SET_SESSION', text: data.text ?? '', exists: data.exists });
  };

  const runWithToast = async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      dispatch({ type: 'SHOW_TOAST', message: errorMessage(error), kind: 'error' });
    }
  };

  const refreshCore = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_CORE_ERROR', error: null });
    const results = await Promise.allSettled([
      loadStatus(), loadJobs(), loadOutputs(), loadSettings(), loadSession(),
    ]);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failures.length > 0) {
      const first = errorMessage(failures[0].reason);
      dispatch({ type: 'SET_CORE_ERROR', error: first });
      dispatch({
        type: 'SHOW_TOAST',
        message: `${failures.length} startup request${failures.length === 1 ? '' : 's'} failed: ${first}`,
        kind: 'error',
      });
    }
    dispatch({ type: 'SET_LOADING', loading: false });
  };

  const refreshRoute = (route: Route): void => {
    if (route.name === 'dashboard') {
      void runWithToast(async () => Promise.all([loadStatus(), loadJobs(), loadOutputs()]).then(() => undefined));
    } else if (route.name === 'jobs') void runWithToast(loadJobs);
    else if (route.name === 'outputs') void runWithToast(loadOutputs);
    else if (route.name === 'session') void runWithToast(loadSession);
    else if (route.name === 'settings' || route.name === 'archive') void runWithToast(loadSettings);
  };

  return {
    loadJobs,
    refreshCore,
    refreshRoute,
    refreshStatus: () => runWithToast(loadStatus),
  };
};
