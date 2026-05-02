export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type JobKind = 'download' | 'download-all' | 'ocr-materials';

export type JobRecord = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  title: string;
  request: Record<string, unknown>;
  logPath: string;
  error?: string;
};

export type PublicJob = Omit<JobRecord, 'logPath'>;
