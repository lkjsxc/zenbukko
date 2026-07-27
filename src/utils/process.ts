import { spawn } from 'node:child_process';

export type CapturedProcessResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
};

export async function runProcess(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ? { ...process.env, ...opts.env } : process.env, stdio: 'inherit' });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
  });
}

export async function runCapturedProcess(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs: number; maxOutputBytes: number },
): Promise<CapturedProcessResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let error: string | undefined;
    let settled = false;
    let forceKill: NodeJS.Timeout | undefined;
    const finish = (result: CapturedProcessResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      resolve(result);
    };
    const append = (current: string, chunk: Buffer): string => `${current}${chunk}`.slice(0, opts.maxOutputBytes);
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ? { ...process.env, ...opts.env } : process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKill = setTimeout(() => child.kill('SIGKILL'), 250);
    }, opts.timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
    child.on('error', (cause) => { error = cause.message; });
    child.on('close', (code) => finish({ code, stdout, stderr, timedOut, ...(error ? { error } : {}) }));
  });
}
