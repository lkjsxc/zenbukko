import type { BackendCapability, WhisperRuntimeBackend } from '../whisper/types.js';
import type { DoctorCheck, DoctorReport, DoctorSnapshot, DoctorStatus } from './types.js';

export function evaluateDoctorSnapshot(snapshot: DoctorSnapshot): DoctorReport {
  const whisper = snapshot.whisper;
  const checks: DoctorCheck[] = [
    check('node', 'Node.js', nodeMajor(snapshot.nodeVersion) >= 22 ? 'pass' : 'fail', `v${snapshot.nodeVersion}`, 'Node.js 22以上を使用してください。'),
    packageManagerCheck(snapshot),
    pathCheck('browser', 'ブラウザー', snapshot.browserPath, snapshot.browserError ?? 'Edge、Chrome、Chromiumが見つかりません。', 'PUPPETEER_EXECUTABLE_PATHを設定してください。'),
    pathCheck('ffmpeg', 'ffmpeg', snapshot.ffmpegPath, 'ffmpegが見つかりません。', 'ffmpegをPATHへ追加するかDocker Composeを使用してください。'),
    pathCheck('pdftoppm', 'Poppler pdftoppm', snapshot.pdftoppmPath, 'pdftoppmが見つかりません。', 'PopplerをインストールしpdftoppmをPATHへ追加してください。'),
    pathCheck('ndlocr', 'NDLOCR-Lite', snapshot.ndlocrPath, 'OCRコマンドが見つかりません。', 'ZENBUKKO_NDLOCR_CMDへ実行ファイルの絶対パスを設定してください。'),
    whisperBackendCheck(snapshot),
    check('whisper-executables', 'Whisperビルド', whisper.executables.some((item) => item.available) ? 'pass' : 'fail', executableDetail(snapshot), 'node dist/index.js setup-whisper --backend cpu --model large-v3-turbo を実行してください。'),
    acceleratorCheck(snapshot, 'vulkan'),
    acceleratorCheck(snapshot, 'cuda'),
    check('whisper-model', 'Whisperモデル', whisper.modelValid ? 'pass' : 'fail', `${whisper.modelPath} (${whisper.modelDetail})`, '指定モデルを再ダウンロードまたは検証済みファイルへ置き換えてください。'),
    check('session', 'NNNセッション', snapshot.sessionExists ? 'pass' : 'warn', snapshot.sessionExists ? snapshot.sessionPath : '保存済みセッションなし', 'node dist/index.js auth を実行してください。'),
    check('output', '出力先', snapshot.outputWritable ? 'pass' : 'fail', snapshot.outputDir, '出力先または既存の親ディレクトリへ書き込めるようにしてください。'),
    check('web-assets', 'Web UIビルド', snapshot.webIndexExists ? 'pass' : 'fail', snapshot.webIndexPath, 'Web UI依存関係をインストールしてビルドしてください。'),
  ];
  return { ok: checks.every((item) => item.status !== 'fail'), platform: `${snapshot.platform}/${snapshot.arch}`, nodeVersion: snapshot.nodeVersion, checks };
}

function whisperBackendCheck(snapshot: DoctorSnapshot): DoctorCheck {
  const whisper = snapshot.whisper;
  if (!whisper.requestedValid) return check('whisper-backend', 'Whisperバックエンド', 'fail', whisper.resolutionError ?? whisper.requested, 'ZENBUKKO_WHISPER_BACKENDをauto、cpu、cuda、vulkanのいずれかへ設定してください。');
  if (!whisper.resolved) return check('whisper-backend', 'Whisperバックエンド', 'fail', `${whisper.requested}: ${whisper.resolutionError ?? 'unavailable'}`, whisperHint(snapshot.platform));
  return check('whisper-backend', 'Whisperバックエンド', 'pass', `requested=${whisper.requested}; resolved=${whisper.resolved.backend}; executable=${whisper.resolved.executable}${whisper.resolved.capability.deviceName ? `; device=${whisper.resolved.capability.deviceName}` : ''}`);
}

function acceleratorCheck(snapshot: DoctorSnapshot, backend: Extract<WhisperRuntimeBackend, 'cuda' | 'vulkan'>): DoctorCheck {
  const capability = snapshot.whisper.capabilities.find((item) => item.backend === backend);
  const executable = snapshot.whisper.executables.find((item) => item.backend === backend);
  const required = snapshot.whisper.requested === backend;
  if (!capability || !executable?.available) {
    const detail = capability ? `このバックエンドはビルドされていません。 ${capabilityDetail(capability)}` : '実行ファイルが見つかりません。';
    return check(`${backend}-runtime`, `${backend.toUpperCase()}ランタイム`, required ? 'fail' : 'pass', detail, `${backend}対応のWhisperをビルドしてください。`);
  }
  const detail = capabilityDetail(capability);
  return check(`${backend}-runtime`, `${backend.toUpperCase()}ランタイム`, capability.available ? 'pass' : required ? 'fail' : 'warn', detail, capability.available ? undefined : acceleratorHint(backend));
}

function capabilityDetail(capability: BackendCapability): string {
  const nodes = capability.renderNodes?.map((node) => `${node.path}${node.accessible ? '' : ' (inaccessible)'}`).join(', ');
  return [capability.detail, capability.deviceName ? `device=${capability.deviceName}` : '', nodes ? `render nodes=${nodes}` : '', capability.icdPaths?.length ? `ICDs=${capability.icdPaths.join(', ')}` : ''].filter(Boolean).join('; ');
}

function executableDetail(snapshot: DoctorSnapshot): string {
  return snapshot.whisper.executables.map((item) => `${item.backend}=${item.path ?? 'not built'}`).join('; ');
}

function packageManagerCheck(snapshot: DoctorSnapshot): DoctorCheck {
  const found = [snapshot.npmPath, snapshot.pnpmPath].filter((value): value is string => Boolean(value));
  return check('package-manager', 'パッケージマネージャー', found.length ? 'pass' : 'warn', found.length ? found.join(', ') : 'npm/pnpmなし', '依存関係の再インストールにはnpmまたはpnpmが必要です。');
}

function pathCheck(id: string, label: string, value: string | null, missing: string, hint: string): DoctorCheck {
  return check(id, label, value ? 'pass' : 'fail', value ?? missing, hint);
}

function acceleratorHint(backend: 'cuda' | 'vulkan'): string {
  return backend === 'vulkan' ? 'Linuxでは/dev/dri/renderD*、Vulkan loader/ICD、Mesa RADVを確認してください。' : 'NVIDIA Container Toolkitとnvidia-smiを確認してください。';
}

function check(id: string, label: string, status: DoctorStatus, detail: string, hint?: string): DoctorCheck {
  return { id, label, status, detail, ...(status !== 'pass' && hint ? { hint } : {}) };
}

function nodeMajor(version: string): number { return Number(version.split('.')[0] ?? 0); }

function whisperHint(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'whisper-cli.exeを手動配置するか、WSL2でsetup-whisperを実行してください。' : 'node dist/index.js setup-whisper --backend cpu --model large-v3-turbo を実行してください。';
}
