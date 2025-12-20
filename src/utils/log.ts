export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const levels: Record<Exclude<LogLevel, 'silent'>, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  public constructor(private readonly level: LogLevel) {}

  private should(level: Exclude<LogLevel, 'silent'>): boolean {
    if (this.level === 'silent') return false;
    return levels[level] <= levels[this.level];
  }

  error(message: string, meta?: unknown): void {
    if (!this.should('error')) return;
    console.error(message, meta ?? '');
  }

  warn(message: string, meta?: unknown): void {
    if (!this.should('warn')) return;
    console.warn(message, meta ?? '');
  }

  info(message: string, meta?: unknown): void {
    if (!this.should('info')) return;
    console.log(message, meta ?? '');
  }

  debug(message: string, meta?: unknown): void {
    if (!this.should('debug')) return;
    console.debug(message, meta ?? '');
  }
}
