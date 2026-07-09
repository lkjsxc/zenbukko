import type { DoctorCheck, DoctorReport, DoctorSnapshot, DoctorStatus } from './types.js';

export function evaluateDoctorSnapshot(snapshot: DoctorSnapshot): DoctorReport {
  const checks: DoctorCheck[] = [
    check('node', 'Node.js', nodeMajor(snapshot.nodeVersion) >= 22 ? 'pass' : 'fail', `v${snapshot.nodeVersion}`, 'Node.js 22以上を使用してください。'),
    packageManagerCheck(snapshot),
    pathCheck('browser', 'ブラウザー', snapshot.browserPath, snapshot.browserError ?? 'Edge、Chrome、Chromiumが見つかりません。', 'PUPPETEER_EXECUTABLE_PATHを設定してください。'),
    pathCheck('ffmpeg', 'ffmpeg', snapshot.ffmpegPath, 'ffmpegが見つかりません。', 'ffmpeg.exeをPATHへ追加するか依存関係を再インストールしてください。'),
    pathCheck('pdftoppm', 'Poppler pdftoppm', snapshot.pdftoppmPath, 'pdftoppmが見つかりません。', 'PopplerをインストールしpdftoppmをPATHへ追加してください。'),
    pathCheck('ndlocr', 'NDLOCR-Lite', snapshot.ndlocrPath, 'OCRコマンドが見つかりません。', 'ZENBUKKO_NDLOCR_CMDへ実行ファイルの絶対パスを設定してください。'),
    pathCheck('whisper', 'whisper.cpp', snapshot.whisperPath, 'whisper.cpp実行ファイルが見つかりません。', whisperHint(snapshot.platform)),
    check('whisper-model', 'Whisperモデル', snapshot.whisperModelExists ? 'pass' : 'fail', snapshot.whisperModelPath, '指定モデルをwhisper.cpp/modelsへ配置してください。'),
    check('session', 'NNNセッション', snapshot.sessionExists ? 'pass' : 'warn', snapshot.sessionExists ? snapshot.sessionPath : '保存済みセッションなし', 'node dist/index.js auth を実行してください。'),
    check('output', '出力先', snapshot.outputWritable ? 'pass' : 'fail', snapshot.outputDir, '出力先または既存の親ディレクトリへ書き込めるようにしてください。'),
    check('web-assets', 'Web UIビルド', snapshot.webIndexExists ? 'pass' : 'fail', snapshot.webIndexPath, 'Web UI依存関係をインストールしてビルドしてください。'),
  ];
  return {
    ok: checks.every((item) => item.status !== 'fail'),
    platform: `${snapshot.platform}/${snapshot.arch}`,
    nodeVersion: snapshot.nodeVersion,
    checks,
  };
}

function packageManagerCheck(snapshot: DoctorSnapshot): DoctorCheck {
  const found = [snapshot.npmPath, snapshot.pnpmPath].filter((value): value is string => Boolean(value));
  return check(
    'package-manager',
    'パッケージマネージャー',
    found.length > 0 ? 'pass' : 'warn',
    found.length > 0 ? found.join(', ') : 'npm/pnpmなし',
    '依存関係の再インストールにはnpmまたはpnpmが必要です。',
  );
}

function pathCheck(id: string, label: string, value: string | null, missing: string, hint: string): DoctorCheck {
  return check(id, label, value ? 'pass' : 'fail', value ?? missing, hint);
}

function check(id: string, label: string, status: DoctorStatus, detail: string, hint?: string): DoctorCheck {
  return { id, label, status, detail, ...(status !== 'pass' && hint ? { hint } : {}) };
}

function nodeMajor(version: string): number {
  return Number(version.split('.')[0] ?? 0);
}

function whisperHint(platform: NodeJS.Platform): string {
  return platform === 'win32'
    ? 'whisper-cli.exeを手動配置するか、WSL2でsetup-whisperを実行してください。'
    : 'node dist/index.js setup-whisper --backend cpu --model large-v3-turbo を実行してください。';
}
