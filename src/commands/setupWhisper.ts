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
  backend?: 'auto' | 'cpu' | 'cuda' | 'both';
  force: boolean;
}): Promise<void> {
  const whisperDir = getWhisperDir();
  const projectRoot = path.dirname(whisperDir);
  const cmakeBinDir = path.join(projectRoot, '.tools', 'cmake', 'bin');
  const env: NodeJS.ProcessEnv = {
    PATH: `${cmakeBinDir}:${process.env.PATH ?? ''}`,
  };

  const backend = params.backend ?? backendFromEnv();
  const cudaArch = (process.env.ZENBUKKO_CMAKE_CUDA_ARCHITECTURES ?? '').trim();
  const buildJobs = normalizeBuildJobs(process.env.ZENBUKKO_CMAKE_BUILD_PARALLEL_LEVEL);

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

  const builds = backend === 'both' ? ['cpu', 'cuda'] as const : [backend === 'auto' ? 'cpu' : backend] as const;
  if (hasCmake) {
    for (const build of builds) {
      await buildWithCmake({ whisperDir, env, build, buildJobs, cudaArch, logger: params.logger });
    }
  } else {
    if (backend === 'cuda' || backend === 'both') params.logger.warn('CMake is required for CUDA whisper build; falling back to CPU make build.');
    params.logger.info(`Building whisper.cpp (make, CPU${buildJobs ? `, ${buildJobs} job(s)` : ''})…`);
    await runProcess('make', [buildJobs ? `-j${buildJobs}` : '-j'], { cwd: whisperDir, env });
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

async function buildWithCmake(params: {
  whisperDir: string;
  env: NodeJS.ProcessEnv;
  build: 'cpu' | 'cuda';
  buildJobs: string | undefined;
  cudaArch: string;
  logger: Logger;
}): Promise<void> {
  const buildDir = params.build === 'cuda' ? 'build-cuda' : 'build-cpu';
  const cmakeArgs = ['-B', buildDir, '-DCMAKE_BUILD_TYPE=Release'];
  if (params.build === 'cuda') {
    cmakeArgs.push('-DGGML_CUDA=1');
    if (params.cudaArch) cmakeArgs.push(`-DCMAKE_CUDA_ARCHITECTURES=${params.cudaArch}`);
  }
  params.logger.info(`Configuring whisper.cpp (${params.build})…`);
  await runProcess('cmake', cmakeArgs, { cwd: params.whisperDir, env: params.env });
  params.logger.info(`Building whisper.cpp (${params.build}${params.buildJobs ? `, ${params.buildJobs} job(s)` : ''})…`);
  await runProcess('cmake', ['--build', buildDir, ...(params.buildJobs ? ['--parallel', params.buildJobs] : ['-j']), '--config', 'Release'], {
    cwd: params.whisperDir,
    env: params.env,
  });
}

function backendFromEnv(): 'auto' | 'cpu' | 'cuda' | 'both' {
  const value = (process.env.ZENBUKKO_WHISPER_BACKEND ?? '').trim();
  if (value === 'cpu' || value === 'cuda' || value === 'both') return value;
  if ((process.env.ZENBUKKO_WHISPER_CUDA ?? '').trim() === '1') return 'cuda';
  return 'auto';
}

function normalizeBuildJobs(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n < 1) return undefined;
  return String(Math.trunc(n));
}
