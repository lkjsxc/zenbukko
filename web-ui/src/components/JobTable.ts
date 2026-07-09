import type { PublicJob } from '../state/types.js';
import { el, escapeHtml, formatTime } from '../utils/html.js';

const badgeClass = (status: string): string => {
  if (status === 'succeeded') return 'pill-success';
  if (status === 'failed') return 'pill-danger';
  if (status === 'running') return 'pill-accent';
  return 'pill-warning';
};

export const renderJobTable = (jobs: PublicJob[], selectedId: string | null): HTMLElement => {
  const table = el('table', { className: 'data-table job-table' });
  table.innerHTML = `
    <caption class="sr-only">Background jobs</caption>
    <thead><tr>
      <th scope="col">ID</th><th scope="col">Job</th><th scope="col">Status</th>
      <th scope="col">Updated</th><th scope="col">Error</th>
    </tr></thead>`;
  const body = el('tbody', { 'data-table': 'jobs' });
  for (const job of jobs) {
    const row = el('tr', {
      'data-action': 'select-job',
      'data-id': job.id,
      className: job.id === selectedId ? 'selected' : '',
    });
    row.innerHTML = `
      <td><button type="button" class="btn btn-ghost btn-sm" data-action="select-job" data-id="${escapeHtml(job.id)}">${escapeHtml(job.id)}</button></td>
      <td>${escapeHtml(job.title)}</td>
      <td><span class="pill ${badgeClass(job.status)}">${escapeHtml(job.status)}</span></td>
      <td>${escapeHtml(formatTime(job.updatedAt))}</td>
      <td class="error-cell">${escapeHtml(job.error ?? '')}</td>`;
    body.append(row);
  }
  table.append(body);
  return table;
};

export const bindJobTable = (table: HTMLElement, onSelect: (id: string) => void): void => {
  table.querySelector('tbody')?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('[data-action="select-job"]') as HTMLElement | null;
    const id = target?.dataset.id;
    if (id) onSelect(id);
  });
};
