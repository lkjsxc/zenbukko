import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../utils/log.js';
import { ensureDir, fileExists } from '../utils/fs.js';
import { runProcess } from '../utils/process.js';
import { getWhisperDir, resolveModelPath } from '../whisper/whisperPaths.js';
import { which } from '../utils/which.js';

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

  const wantCuda = (process.env.ZENBUKKO_WHISPER_CUDA ?? '').trim() === '1';
  const cudaArch = (process.env.ZENBUKKO_CMAKE_CUDA_ARCHITECTURES ?? '').trim();

  if (params.force && (await fileExists(whisperDir))) {
    params.logger.warn(`Removing existing whisper.cpp at ${whisperDir}`);
    await fs.rm(whisperDir, { recursive: true, force: true });
  }

  if (!(await fileExists(whisperDir))) {
    await ensureDir(path.dirname(whisperDir));
    params.logger.info('Cloning whisper.cpp…');
    await runProcess('git', ['clone', 'https://github.com/ggerganov/whisper.cpp', whisperDir]);
  }

  const cmakeFromTools = path.join(cmakeBinDir, 'cmake');
  const hasCmake = (await fileExists(cmakeFromTools)) || (await which('cmake'));
  if (!hasCmake) {
    params.logger.warn(
      `CMake not found. Falling back to 'make'. (Tip: install cmake, or place a portable cmake at ${cmakeFromTools})`,
    );
  }

  if (hasCmake) {
    const cmakeArgs = ['-B', 'build', '-DCMAKE_BUILD_TYPE=Release'];
    if (wantCuda) {
      cmakeArgs.push('-DGGML_CUDA=1');
      if (cudaArch) cmakeArgs.push(`-DCMAKE_CUDA_ARCHITECTURES=${cudaArch}`);
    }

    params.logger.info(`Configuring whisper.cpp (cmake${wantCuda ? ' + CUDA' : ''})…`);
    await runProcess('cmake', cmakeArgs, { cwd: whisperDir, env });

    params.logger.info('Building whisper.cpp (cmake --build)…');
    await runProcess('cmake', ['--build', 'build', '-j', '--config', 'Release'], { cwd: whisperDir, env });
  } else {
    params.logger.info(`Building whisper.cpp (make${wantCuda ? ' (CPU only)' : ''})…`);
    await runProcess('make', ['-j'], { cwd: whisperDir, env });
  }

  const modelPath = resolveModelPath(params.model);
  if (!(await fileExists(modelPath))) {
    params.logger.info(`Downloading model: ${params.model}`);
    await runProcess('bash', ['models/download-ggml-model.sh', params.model], { cwd: whisperDir, env });
  } else {
    params.logger.info(`Model already present: ${modelPath}`);
  }

  params.logger.info('Whisper setup complete.');
}
