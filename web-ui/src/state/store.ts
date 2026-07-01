import type { AppEvent, AppState } from './types.js';

export const initialState = (token: string): AppState => ({
  route: { name: 'dashboard' },
  token,
  loading: false,
  status: null,
  jobs: [],
  courses: [],
  outputs: [],
  settings: null,
  sessionText: '',
  sessionExists: false,
  selectedJobId: null,
  logText: '',
  logPaused: false,
  outputPreview: null,
  courseDetail: null,
  toast: null,
});

export const reduce = (state: AppState, event: AppEvent): AppState => {
  switch (event.type) {
    case 'SET_ROUTE':
      return { ...state, route: event.route };
    case 'SET_TOKEN':
      return { ...state, token: event.token };
    case 'SET_LOADING':
      return { ...state, loading: event.loading };
    case 'SET_STATUS':
      return { ...state, status: event.status };
    case 'SET_JOBS':
      return { ...state, jobs: event.jobs };
    case 'SET_COURSES':
      return { ...state, courses: event.courses };
    case 'SET_OUTPUTS':
      return { ...state, outputs: event.outputs };
    case 'SET_SETTINGS':
      return { ...state, settings: event.settings };
    case 'SET_SESSION':
      return { ...state, sessionText: event.text, sessionExists: event.exists };
    case 'SELECT_JOB':
      return { ...state, selectedJobId: event.jobId, logText: event.jobId ? state.logText : '' };
    case 'APPEND_LOG':
      return { ...state, logText: state.logText + event.line + '\n' };
    case 'CLEAR_LOG':
      return { ...state, logText: '' };
    case 'SET_LOG_PAUSED':
      return { ...state, logPaused: event.paused };
    case 'SET_OUTPUT_PREVIEW':
      return { ...state, outputPreview: event.preview };
    case 'SET_COURSE_DETAIL':
      return { ...state, courseDetail: event.detail };
    case 'SHOW_TOAST':
      return { ...state, toast: { message: event.message, kind: event.kind } };
    case 'DISMISS_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
};
