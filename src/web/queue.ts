import fs from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { AppConfig } from '../config.js';
import { ensureDir } from '../utils/fs.js';
import type { Logger } from '../utils/log.js';
import { runJob } from './jobRunner.js';
import { JobLogger } from './jobLogger.js';
import type { JobKind, JobRecord } from './types.js';

export class WebJobQueue {
  private readonly events = new EventEmitter();
  private readonly jobs = new Map<string, JobRecord>();
  private running = false;

  public constructor(
    private readonly cfg: AppConfig,
    private readonly webDir: string,
    private readonly baseLogger: Logger,
  ) {}

  async init(): Promise<void> {
    await ensureDir(this.jobsDir);
    const entries = await fs.readdir(this.jobsDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const job = JSON.parse(await fs.readFile(path.join(this.jobsDir, entry.name), 'utf8')) as JobRecord;
      if (job.status === 'running') {
        job.status = 'failed';
        job.error = 'Marked failed after web server restart.';
        job.updatedAt = new Date().toISOString();
        await this.persist(job);
      }
      this.jobs.set(job.id, job);
    }
  }

  list(): JobRecord[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }

  subscribe(id: string, onLine: (line: string) => void): () => void {
    const event = `job:${id}`;
    this.events.on(event, onLine);
    return () => this.events.off(event, onLine);
  }

  async enqueue(kind: JobKind, request: Record<string, unknown>): Promise<JobRecord> {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const logPath = path.join(this.jobsDir, `${id}.log`);
    const job: JobRecord = { id, kind, status: 'queued', createdAt: now, updatedAt: now, title: titleFor(kind, request), request, logPath };
    this.jobs.set(id, job);
    await this.persist(job);
    await fs.writeFile(logPath, '', 'utf8');
    void this.drain();
    return job;
  }

  private get jobsDir(): string {
    return path.join(this.webDir, 'jobs');
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (;;) {
        const next = this.list().reverse().find((j) => j.status === 'queued');
        if (!next) return;
        await this.run(next);
      }
    } finally {
      this.running = false;
    }
  }

  private async run(job: JobRecord): Promise<void> {
    job.status = 'running';
    job.updatedAt = new Date().toISOString();
    await this.persist(job);
    const logger = new JobLogger(this.cfg.logLevel, job.logPath, (line) => this.events.emit(`job:${job.id}`, line));
    try {
      logger.info(`Starting job ${job.id}: ${job.title}`);
      await runJob(job, this.cfg, logger);
      job.status = 'succeeded';
      logger.info(`Job succeeded: ${job.id}`);
    } catch (e) {
      job.status = 'failed';
      job.error = e instanceof Error ? e.message : String(e);
      logger.error(`Job failed: ${job.error}`);
      this.baseLogger.error(`Web job failed: ${job.id} (${job.error})`);
    } finally {
      job.updatedAt = new Date().toISOString();
      await this.persist(job);
      this.events.emit(`job:${job.id}`, `[${new Date().toISOString()}] status:${job.status}`);
    }
  }

  private async persist(job: JobRecord): Promise<void> {
    await ensureDir(this.jobsDir);
    await fs.writeFile(path.join(this.jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8');
  }
}

function titleFor(kind: JobKind, request: Record<string, unknown>): string {
  if (kind === 'download') return `Study materials from ${String(request.learningUrl ?? request.courseId ?? '')}`.trim();
  if (kind === 'download-all') return 'Download all courses';
  return `OCR materials ${String(request.inputDir ?? '')}`.trim();
}
