import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../utils/log.js';
import { ensureDir, fileExists } from '../utils/fs.js';
import { runProcess } from '../utils/process.js';
import { getWhisperDir, resolveModelPath } from '../whisper/whisperPaths.js';

export async function setupWhisperCommand(params: {
  logger: Logger;
  model: string;
  force: boolean;
}): Promise<void> {
  const whisperDir = getWhisperDir();
  const projectRoot = path.dirname(whisperDir);
  const cmakeBinDir = path.join(projectRoot, '.tools', 'cmake', 'bin');
  const env: NodeJS.ProcessEnv = {
    PATH: `${cmakeBinDir}:${process.env.PATH ?? ''}`,
  };

  if (params.force && (await fileExists(whisperDir))) {
    params.logger.warn(`Removing existing whisper.cpp at ${whisperDir}`);
    await fs.rm(whisperDir, { recursive: true, force: true });
  }

  if (!(await fileExists(whisperDir))) {
    await ensureDir(path.dirname(whisperDir));
    params.logger.info('Cloning whisper.cpp…');
    await runProcess('git', ['clone', 'https://github.com/ggerganov/whisper.cpp', whisperDir]);
  }

  if (!(await fileExists(path.join(cmakeBinDir, 'cmake')))) {
    params.logger.warn(
      `CMake not found at ${cmakeBinDir}/cmake. If build fails, download a portable cmake into new/.tools/cmake/bin.`,
    );
  }

  params.logger.info('Building whisper.cpp (make)…');
  await runProcess('make', ['-j'], { cwd: whisperDir, env });

  const modelPath = resolveModelPath(params.model);
  if (!(await fileExists(modelPath))) {
    params.logger.info(`Downloading model: ${params.model}`);
    await runProcess('bash', ['models/download-ggml-model.sh', params.model], { cwd: whisperDir, env });
  } else {
    params.logger.info(`Model already present: ${modelPath}`);
  }

  params.logger.info('Whisper setup complete.');
}
