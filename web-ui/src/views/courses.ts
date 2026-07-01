import type { AppState } from '../state/types.js';
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
  const search = el('input', { type: 'search', placeholder: 'Search courses...', className: 'input' }) as HTMLInputElement;
  const loadBtn = button('Load courses', { variant: 'primary' });

  loadBtn.addEventListener('click', async () => {
    loadBtn.disabled = true;
    try {
      const data = await apiFetch<{ courses: AppState['courses'] }>(state.token, '/api/courses');
      dispatch({ type: 'SET_COURSES', courses: data.courses });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', message: e instanceof Error ? e.message : String(e), kind: 'error' });
    } finally {
      loadBtn.disabled = false;
    }
  });

  body.append(el('div', { className: 'row' }, search, loadBtn));

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

  if (state.courses.length === 0) body.append(emptyState('Load courses after saving a session.'));
  else renderRows();

  return card('Courses', body);
};
