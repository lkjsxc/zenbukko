import { appendLogText } from '../utils/logText.js';
import type { AppEvent, AppState } from './types.js';

export const initialState = (): AppState => ({
  route: { name: 'dashboard' },
  loading: true,
  coreError: null,
  status: null,
  jobs: [],
  courses: [],
  coursesStatus: 'idle',
  coursesError: null,
  courseQuery: '',
  outputs: [],
  settings: null,
  sessionText: '',
  sessionExists: false,
  sessionLoaded: false,
  selectedJobId: null,
  logText: '',
  logPaused: false,
  streamStatus: 'idle',
  outputFilter: 'all',
  selectedOutputPath: null,
  outputPreview: null,
  outputPreviewStatus: 'idle',
  outputPreviewError: null,
  courseDetail: null,
  toasts: [],
  nextToastId: 1,
});

export const reduce = (state: AppState, event: AppEvent): AppState => {
  switch (event.type) {
    case 'SET_ROUTE': return { ...state, route: event.route };
    case 'SET_LOADING': return { ...state, loading: event.loading };
    case 'SET_CORE_ERROR': return { ...state, coreError: event.error };
    case 'SET_STATUS': return { ...state, status: event.status };
    case 'SET_JOBS': return { ...state, jobs: event.jobs };
    case 'SET_COURSES':
      return { ...state, courses: event.courses, coursesStatus: 'ready', coursesError: null };
    case 'SET_COURSES_STATUS':
      return { ...state, coursesStatus: event.status, coursesError: event.error ?? null };
    case 'SET_COURSE_QUERY': return { ...state, courseQuery: event.query };
    case 'SET_OUTPUTS': return { ...state, outputs: event.outputs };
    case 'SET_SETTINGS': return { ...state, settings: event.settings };
    case 'SET_SESSION': return { ...state, sessionText: event.text, sessionExists: event.exists, sessionLoaded: true };
    case 'SELECT_JOB':
      return event.jobId === state.selectedJobId
        ? state
        : { ...state, selectedJobId: event.jobId, logText: '' };
    case 'APPEND_LOG': return { ...state, logText: appendLogText(state.logText, event.line) };
    case 'CLEAR_LOG': return { ...state, logText: '' };
    case 'SET_LOG_PAUSED': return { ...state, logPaused: event.paused };
    case 'SET_STREAM_STATUS': return { ...state, streamStatus: event.status };
    case 'SET_OUTPUT_FILTER': return { ...state, outputFilter: event.filter };
    case 'SELECT_OUTPUT':
      return {
        ...state,
        selectedOutputPath: event.path,
        outputPreview: null,
        outputPreviewStatus: event.path ? 'loading' : 'idle',
        outputPreviewError: null,
      };
    case 'SET_OUTPUT_PREVIEW':
      return { ...state, outputPreview: event.preview, outputPreviewStatus: 'ready', outputPreviewError: null };
    case 'SET_OUTPUT_PREVIEW_STATUS':
      return { ...state, outputPreviewStatus: event.status, outputPreviewError: event.error ?? null };
    case 'SET_COURSE_DETAIL': return { ...state, courseDetail: event.detail };
    case 'SHOW_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { id: state.nextToastId, message: event.message, kind: event.kind }],
        nextToastId: state.nextToastId + 1,
      };
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== event.id) };
    case 'RETRY_CORE':
    case 'REFRESH_STATUS':
      return state;
  }
};
