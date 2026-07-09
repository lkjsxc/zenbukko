import type { AppConfig } from '../config.js';
import { evaluateDoctorSnapshot } from '../doctor/checks.js';
import { collectDoctorSnapshot } from '../doctor/probes.js';
import type { DoctorReport } from '../doctor/types.js';

export async function doctorCommand(params: {
  config: AppConfig;
  model: string;
  json: boolean;
  write?: (value: string) => void;
}): Promise<DoctorReport> {
  const snapshot = await collectDoctorSnapshot(params.config, params.model);
  const report = evaluateDoctorSnapshot(snapshot);
  const write = params.write ?? ((value) => process.stdout.write(value));
  write(params.json ? `${JSON.stringify(report, null, 2)}\n` : renderDoctorReport(report));
  return report;
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines = [
    `Zenbukko native diagnostics (${report.platform}, Node v${report.nodeVersion})`,
    '',
  ];
  for (const item of report.checks) {
    lines.push(`[${item.status.toUpperCase()}] ${item.label}: ${item.detail}`);
    if (item.hint) lines.push(`  次の操作: ${item.hint}`);
  }
  lines.push('', report.ok ? 'すべての機能依存関係を確認できました。' : '不足項目を解決してから対象機能を再実行してください。', '');
  return lines.join('\n');
}
