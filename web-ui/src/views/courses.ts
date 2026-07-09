import type { AppState, CourseItem } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { apiFetch } from '../api/client.js';
import { card, button, emptyState } from '../components/primitives.js';
import { renderChapterTable } from '../components/ChapterPicker.js';
import { el, escapeHtml } from '../utils/html.js';
import { navigate } from '../router/hash.js';
import type { ChapterItem } from '../state/types.js';

type CourseDetail = { courseId: number; title?: string; chapters: ChapterItem[] };

export const renderCourses = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  const search = el('input', { type: 'search', placeholder: 'Search imported courses...', className: 'input' }) as HTMLInputElement;
  const importText = el('textarea', {
    className: 'code-input',
    placeholder: 'Paste JSON from: zenbukko list-courses --format json',
  }) as HTMLTextAreaElement;
  const importBtn = button('Import CLI course JSON', { variant: 'primary' });

  importBtn.addEventListener('click', () => {
    try {
      const courses = parseCourseListJson(importText.value);
      dispatch({ type: 'SET_COURSES', courses });
      dispatch({ type: 'SHOW_TOAST', message: `Imported ${courses.length} course(s).`, kind: 'success' });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    }
  });

  body.append(
    el('p', { className: 'muted', text: 'Run `zenbukko list-courses --format json` in the CLI, then paste the JSON here. The Web UI does not scrape the course list.' }),
    importText,
    el('div', { className: 'row' }, importBtn),
    el('div', { className: 'row' }, search),
  );

  const table = el('table', { className: 'data-table' });
  table.innerHTML = '<thead><tr><th>ID</th><th>Title</th><th>Source</th><th></th></tr></thead>';
  const tbody = el('tbody', { 'data-table': 'courses' });

  const filter = () => search.value.trim().toLowerCase();
  const renderRows = () => {
    tbody.replaceChildren();
    const q = filter();
    for (const c of state.courses) {
      const hay = `${c.courseId} ${c.title} ${c.sourceTabId ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const row = el('tr');
      row.innerHTML = `<td>${c.courseId}</td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.sourceTabId ?? '')}</td><td></td>`;
      const archiveBtn = button('Archive', { variant: 'ghost' });
      archiveBtn.addEventListener('click', () => navigate({ name: 'archive', courseId: String(c.courseId) }));
      const detailBtn = button('Chapters', { variant: 'secondary' });
      detailBtn.addEventListener('click', async () => {
        detailBtn.disabled = true;
        try {
          const detail = await apiFetch<CourseDetail>(state.token, `/api/courses/${c.courseId}`);
          dispatch({ type: 'SET_COURSE_DETAIL', detail });
        } catch (e) {
          dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
        } finally {
          detailBtn.disabled = false;
        }
      });
      row.children[3]?.append(archiveBtn, detailBtn);
      tbody.append(row);
    }
  };

  search.addEventListener('input', renderRows);
  table.append(tbody);
  body.append(table);

  if (state.courseDetail) {
    body.append(el('h3', { text: `Chapters: ${state.courseDetail.title ?? state.courseDetail.courseId}` }));
    body.append(renderChapterTable(state.courseDetail.chapters));
  }

  if (state.courses.length === 0) body.append(emptyState('Import course JSON from the CLI to populate this table.'));
  else renderRows();

  return card('Courses', body);
};

function parseCourseListJson(raw: string): CourseItem[] {
  const parsed = JSON.parse(raw) as unknown;
  const list = Array.isArray(parsed) ? parsed : courseArrayFromObject(parsed);
  if (!Array.isArray(list)) throw new Error('Expected the JSON array from `zenbukko list-courses --format json`.');
  return list.map(parseCourseItem);
}

function courseArrayFromObject(value: unknown): unknown {
  return value && typeof value === 'object' && Array.isArray((value as { courses?: unknown }).courses)
    ? (value as { courses: unknown[] }).courses
    : undefined;
}

function parseCourseItem(value: unknown): CourseItem {
  if (!value || typeof value !== 'object') throw new Error('Course JSON entries must be objects.');
  const item = value as Record<string, unknown>;
  const courseId = Number(item.courseId ?? item.id);
  if (!Number.isFinite(courseId)) throw new Error('Course JSON entries must include numeric courseId.');
  const title = typeof item.title === 'string' && item.title.trim() ? item.title : `course-${courseId}`;
  const course: CourseItem = { courseId, title };
  if (typeof item.sourceTabId === 'string') course.sourceTabId = item.sourceTabId;
  if (typeof item.sourceTabLabel === 'string') course.sourceTabLabel = item.sourceTabLabel;
  return course;
}
