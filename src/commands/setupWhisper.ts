import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../utils/log.js';
import { ensureDir, fileExists } from '../utils/fs.js';
import { runCapturedProcess, runProcess } from '../utils/process.js';
import { which } from '../utils/which.js';
import { buildTargets, cmakeArgsFor, parseWhisperSetupBackend } from '../whisper/backends.js';
import { downloadWhisperModel } from '../whisper/models.js';
import type { WhisperRuntimeBackend, WhisperSetupBackend } from '../whisper/types.js';
import { getProjectRoot, getWhisperDir, readWhisperCppRef } from '../whisper/whisperPaths.js';

export async function setupWhisperCommand(params: { logger: Logger; model: string; backend?: WhisperSetupBackend; force: boolean }): Promise<void> {
  const whisperDir = getWhisperDir();
  const projectRoot = getProjectRoot();
  const ref = await readWhisperCppRef();
  const backend = params.backend ?? parseWhisperSetupBackend(process.env.ZENBUKKO_WHISPER_BACKEND);
  const builds = buildTargets(backend);
  if (builds.includes('vulkan') && process.platform !== 'linux') throw new Error('Native Vulkan whisper setup is supported on Linux only. Use CPU or CUDA on this platform.');
  if (params.force && await fileExists(whisperDir)) await removeWhisperCheckout(whisperDir, params.logger);
  await ensurePinnedCheckout(whisperDir, ref, params.logger);
  const cmakeBinDir = path.join(projectRoot, '.tools', 'cmake', 'bin');
  const env = { PATH: `${cmakeBinDir}:${process.env.PATH ?? ''}` };
  const hasCmake = Boolean(await which('cmake') || await fileExists(path.join(cmakeBinDir, 'cmake')));
  if (!hasCmake && builds.some((build) => build !== 'cpu')) throw new Error('CMake is required for CUDA and Vulkan Whisper builds. Install CMake and Vulkan glslc when building Vulkan.');
  const jobs = normalizeBuildJobs(process.env.ZENBUKKO_CMAKE_BUILD_PARALLEL_LEVEL);
  if (hasCmake) for (const build of builds) await buildWithCmake(whisperDir, build, env, jobs, params.logger);
  else await buildCpuWithMake(whisperDir, env, jobs, params.logger);
  const modelPath = await downloadWhisperModel(params.model);
  params.logger.info(`Whisper model ready: ${modelPath}`);
  params.logger.info(`Whisper setup complete at upstream revision ${ref}.`);
}

async function ensurePinnedCheckout(directory: string, ref: string, logger: Logger): Promise<void> {
  if (await fileExists(directory)) {
    const result = await runCapturedProcess('git', ['-C', directory, 'rev-parse', 'HEAD'], { timeoutMs: 5_000, maxOutputBytes: 4_096 });
    if (result.code === 0 && result.stdout.trim() === ref) return;
    throw new Error(`Existing whisper.cpp checkout is not pinned to ${ref}. Run setup-whisper --force to replace only the source checkout; models are kept separately.`);
  }
  await ensureDir(path.dirname(directory));
  logger.info(`Fetching whisper.cpp at ${ref}…`);
  await runProcess('git', ['init', directory]);
  await runProcess('git', ['-C', directory, 'remote', 'add', 'origin', 'https://github.com/ggml-org/whisper.cpp']);
  await runProcess('git', ['-C', directory, 'fetch', '--depth', '1', 'origin', ref]);
  await runProcess('git', ['-C', directory, 'checkout', '--detach', 'FETCH_HEAD']);
}

async function removeWhisperCheckout(directory: string, logger: Logger): Promise<void> {
  logger.warn(`Removing whisper.cpp source checkout at ${directory}; model storage is preserved.`);
  await fs.rm(directory, { recursive: true, force: true });
}

async function buildWithCmake(directory: string, backend: WhisperRuntimeBackend, env: NodeJS.ProcessEnv, jobs: string | undefined, logger: Logger): Promise<void> {
  const buildDir = backend === 'cpu' ? 'build-cpu' : `build-${backend}`;
  const args = ['-S', '.', '-B', buildDir, '-DCMAKE_BUILD_TYPE=Release', ...cmakeArgsFor(backend)];
  if (backend === 'cuda' && process.env.ZENBUKKO_CMAKE_CUDA_ARCHITECTURES?.trim()) args.push(`-DCMAKE_CUDA_ARCHITECTURES=${process.env.ZENBUKKO_CMAKE_CUDA_ARCHITECTURES.trim()}`);
  logger.info(`Configuring whisper.cpp (${backend})…`);
  await runProcess('cmake', args, { cwd: directory, env });
  logger.info(`Building whisper.cpp (${backend}${jobs ? `, ${jobs} job(s)` : ''})…`);
  await runProcess('cmake', ['--build', buildDir, '--config', 'Release', ...(jobs ? ['--parallel', jobs] : ['-j'])], { cwd: directory, env });
}

async function buildCpuWithMake(directory: string, env: NodeJS.ProcessEnv, jobs: string | undefined, logger: Logger): Promise<void> {
  logger.warn('CMake not found; building CPU-only whisper.cpp with make.');
  await runProcess('make', [jobs ? `-j${jobs}` : '-j'], { cwd: directory, env });
}

function normalizeBuildJobs(value: string | undefined): string | undefined {
  const count = Number(value?.trim());
  return Number.isFinite(count) && count >= 1 ? String(Math.trunc(count)) : undefined;
}
