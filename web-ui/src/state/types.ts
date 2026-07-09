export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';
export type OutputFilter = 'all' | 'md' | 'transcript' | 'pdf' | 'json' | 'html';
export type ToastKind = 'info' | 'success' | 'error';

export type PublicJob = {
  id: string;
  kind: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  title: string;
  error?: string;
};

export type CourseItem = {
  courseId: number;
  title: string;
  sourceTabId?: string;
  sourceTabLabel?: string;
};

export type ChapterItem = {
  id: number;
  title?: string;
  order?: number;
};

export type OutputItem = {
  path: string;
  size: number;
  updatedAt: string;
};

export type ApiStatus = {
  sessionExists: boolean;
  outputDir: string;
  localOcr: {
    ok: boolean;
    command: string;
    device: 'cpu' | 'cuda';
    diagnostics: Array<{ code: string; message: string }>;
  };
};

export type ApiSettings = {
  ndlocrCommand?: string;
  ndlocrDevice?: 'cpu' | 'cuda';
  ocrPageDpi?: number;
  ocrKeepIntermediates?: boolean;
  ndlocrEnableTcy?: boolean;
};

export type Route =
  | { name: 'dashboard' }
  | { name: 'session' }
  | { name: 'courses' }
  | { name: 'archive'; courseId?: string }
  | { name: 'jobs'; jobId?: string }
  | { name: 'outputs' }
  | { name: 'settings' };

export type AppState = {
  route: Route;
  loading: boolean;
  coreError: string | null;
  status: ApiStatus | null;
  jobs: PublicJob[];
  courses: CourseItem[];
  coursesStatus: LoadStatus;
  coursesError: string | null;
  courseQuery: string;
  outputs: OutputItem[];
  settings: ApiSettings | null;
  sessionText: string;
  sessionExists: boolean;
  sessionLoaded: boolean;
  selectedJobId: string | null;
  logText: string;
  logPaused: boolean;
  streamStatus: StreamStatus;
  outputFilter: OutputFilter;
  selectedOutputPath: string | null;
  outputPreview: { path: string; content: string } | null;
  outputPreviewStatus: LoadStatus;
  outputPreviewError: string | null;
  courseDetail: { courseId: number; title?: string; chapters: ChapterItem[] } | null;
  toasts: Array<{ id: number; message: string; kind: ToastKind }>;
  nextToastId: number;
};

export type AppEvent =
  | { type: 'SET_ROUTE'; route: Route }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_CORE_ERROR'; error: string | null }
  | { type: 'SET_STATUS'; status: ApiStatus | null }
  | { type: 'SET_JOBS'; jobs: PublicJob[] }
  | { type: 'SET_COURSES'; courses: CourseItem[] }
  | { type: 'SET_COURSES_STATUS'; status: LoadStatus; error?: string }
  | { type: 'SET_COURSE_QUERY'; query: string }
  | { type: 'SET_OUTPUTS'; outputs: OutputItem[] }
  | { type: 'SET_SETTINGS'; settings: ApiSettings | null }
  | { type: 'SET_SESSION'; text: string; exists: boolean }
  | { type: 'SELECT_JOB'; jobId: string | null }
  | { type: 'APPEND_LOG'; line: string }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_LOG_PAUSED'; paused: boolean }
  | { type: 'SET_STREAM_STATUS'; status: StreamStatus }
  | { type: 'SET_OUTPUT_FILTER'; filter: OutputFilter }
  | { type: 'SELECT_OUTPUT'; path: string | null }
  | { type: 'SET_OUTPUT_PREVIEW'; preview: { path: string; content: string } | null }
  | { type: 'SET_OUTPUT_PREVIEW_STATUS'; status: LoadStatus; error?: string }
  | { type: 'SET_COURSE_DETAIL'; detail: AppState['courseDetail'] }
  | { type: 'SHOW_TOAST'; message: string; kind: ToastKind }
  | { type: 'DISMISS_TOAST'; id: number }
  | { type: 'RETRY_CORE' }
  | { type: 'REFRESH_STATUS' };
