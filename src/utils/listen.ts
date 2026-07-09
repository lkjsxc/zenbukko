import type { Server } from 'node:http';
import type express from 'express';

export async function listen(
  app: express.Express,
  port: number,
  host: string,
  label: string,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    const cleanup = (): void => {
      server.off('listening', onListening);
      server.off('error', onError);
    };
    const onListening = (): void => { cleanup(); resolve(server); };
    const onError = (error: Error): void => { cleanup(); reject(formatListenError(label, host, port, error)); };
    server.once('listening', onListening);
    server.once('error', onError);
  });
}

export function formatListenError(label: string, host: string, port: number, error: Error): Error {
  const code = 'code' in error ? String(error.code) : '';
  if (code === 'EADDRINUSE') {
    return new Error(`${label}を起動できません。${host}:${port} は既に使用されています。既存プロセスを停止するか別のポートを指定してください。`);
  }
  if (code === 'EACCES') {
    return new Error(`${label}を起動できません。${host}:${port} を使用する権限がありません。1024より大きいポートを指定してください。`);
  }
  return new Error(`${label}を ${host}:${port} で起動できません: ${error.message}`, { cause: error });
}
