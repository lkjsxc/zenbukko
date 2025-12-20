import { interactiveLogin } from '../services/auth.js';
import { SessionStore } from '../session/sessionStore.js';
import type { Logger } from '../utils/log.js';

export async function authCommand(params: {
  sessionPath: string;
  headless: boolean;
  logger: Logger;
}): Promise<void> {
  const store = new SessionStore(params.sessionPath);

  const session = await interactiveLogin({
    headless: params.headless,
    onStatus: (s) => params.logger.info(s),
  });

  await store.save(session);
  params.logger.info(`Saved session to: ${params.sessionPath}`);
}
