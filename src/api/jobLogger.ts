import fs from 'node:fs/promises';
import { Logger, type LogLevel } from '../utils/log.js';

export class JobLogger extends Logger {
  public constructor(
    level: LogLevel,
    private readonly logPath: string,
    private readonly onLine: (line: string) => void,
  ) {
    super(level);
  }

  override error(message: string, meta?: unknown): void {
    this.write('error', message, meta);
  }

  override warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta);
  }

  override info(message: string, meta?: unknown): void {
    this.write('info', message, meta);
  }

  override debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta);
  }

  private write(level: string, message: string, meta?: unknown): void {
    const suffix = meta === undefined || meta === '' ? '' : ` ${JSON.stringify(meta)}`;
    const line = `[${new Date().toISOString()}] ${level}: ${message}${suffix}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    this.onLine(line);
    void fs.appendFile(this.logPath, `${line}\n`, 'utf8');
  }
}
