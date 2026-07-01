export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

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
  token: string;
  loading: boolean;
  status: ApiStatus | null;
  jobs: PublicJob[];
  courses: CourseItem[];
  outputs: OutputItem[];
  settings: ApiSettings | null;
  sessionText: string;
  sessionExists: boolean;
  selectedJobId: string | null;
  logText: string;
  logPaused: boolean;
  outputPreview: { path: string; content: string } | null;
  courseDetail: { courseId: number; title?: string; chapters: ChapterItem[] } | null;
  toast: { message: string; kind: 'info' | 'success' | 'error' } | null;
};

export type AppEvent =
  | { type: 'SET_ROUTE'; route: Route }
  | { type: 'SET_TOKEN'; token: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_STATUS'; status: ApiStatus | null }
  | { type: 'SET_JOBS'; jobs: PublicJob[] }
  | { type: 'SET_COURSES'; courses: CourseItem[] }
  | { type: 'SET_OUTPUTS'; outputs: OutputItem[] }
  | { type: 'SET_SETTINGS'; settings: ApiSettings | null }
  | { type: 'SET_SESSION'; text: string; exists: boolean }
  | { type: 'SELECT_JOB'; jobId: string | null }
  | { type: 'APPEND_LOG'; line: string }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_LOG_PAUSED'; paused: boolean }
  | { type: 'SET_OUTPUT_PREVIEW'; preview: { path: string; content: string } | null }
  | { type: 'SET_COURSE_DETAIL'; detail: AppState['courseDetail'] }
  | { type: 'SHOW_TOAST'; message: string; kind: 'info' | 'success' | 'error' }
  | { type: 'DISMISS_TOAST' };
