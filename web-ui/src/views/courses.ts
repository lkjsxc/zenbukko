import type { AppState, ChapterItem } from '../state/types.js';
import type { Dispatch } from '../app.js';
import { ApiError, apiFetch } from '../api/client.js';
import { button, card, emptyState, field, inlineError, loadingState, tableScroll } from '../components/primitives.js';
import { renderChapterTable } from '../components/ChapterPicker.js';
import { el, escapeHtml } from '../utils/html.js';
import { navigate } from '../router/hash.js';

type CourseDetail = { courseId: number; title?: string; chapters: ChapterItem[] };
let detailRequestId = 0;

export const renderCourses = (state: AppState, dispatch: Dispatch): HTMLElement => {
  const body = el('div', { className: 'stack' });
  const sessionReady = state.status?.sessionExists ?? state.sessionExists;
  if (!sessionReady && state.loading) {
    body.append(loadingState('Checking session readiness…'));
    return card('Courses', body);
  }
  if (!sessionReady) {
    const action = button('Open Session');
    action.addEventListener('click', () => navigate({ name: 'session' }));
    body.append(el('div', { className: 'empty-state stack' }, el('p', { text: 'A saved session is required to load courses.' }), action));
    return card('Courses', body);
  }

  const search = el('input', { type: 'search', className: 'input', value: state.courseQuery }) as HTMLInputElement;
  const loadBtn = button(state.coursesStatus === 'loading' ? 'Loading courses…' : 'Load courses', {
    disabled: state.coursesStatus === 'loading',
  });
  loadBtn.setAttribute('aria-busy', String(state.coursesStatus === 'loading'));
  loadBtn.addEventListener('click', () => { void loadCourses(dispatch); });
  body.append(el('div', { className: 'course-tools' }, field('Search courses', search), loadBtn));

  if (state.coursesStatus === 'loading') body.append(loadingState('Loading authenticated courses…'));
  else if (state.coursesStatus === 'error') {
    body.append(inlineError(state.coursesError ?? 'Courses could not be loaded.', () => { void loadCourses(dispatch); }));
  } else if (state.coursesStatus === 'idle') body.append(emptyState('Courses have not been loaded yet.'));
  else if (state.courses.length === 0) body.append(emptyState('No enrolled courses were found.'));
  else body.append(courseTable(state, dispatch, search));

  if (state.courseDetail) body.append(courseDetailPanel(state.courseDetail, dispatch));
  return card('Courses', body);
};

const loadCourses = async (dispatch: Dispatch): Promise<void> => {
  dispatch({ type: 'SET_COURSES_STATUS', status: 'loading' });
  try {
    const data = await apiFetch<{ courses: AppState['courses'] }>('/api/courses');
    dispatch({ type: 'SET_COURSES', courses: data.courses });
  } catch (error) {
    const message = error instanceof ApiError && error.status === 404
      ? 'Session is missing or expired. Save a new session and try again.'
      : error instanceof Error ? error.message : String(error);
    dispatch({ type: 'SET_COURSES_STATUS', status: 'error', error: message });
    dispatch({ type: 'SHOW_TOAST', message, kind: 'error' });
  }
};

const courseTable = (state: AppState, dispatch: Dispatch, search: HTMLInputElement): HTMLElement => {
  const root = el('div', { className: 'stack' });
  const table = el('table', { className: 'data-table' });
  table.innerHTML = `
    <caption class="sr-only">Enrolled courses</caption>
    <thead><tr><th scope="col">ID</th><th scope="col">Title</th><th scope="col">Source</th><th scope="col">Actions</th></tr></thead>`;
  const tbody = el('tbody');
  const noMatches = emptyState('No courses match this search.');

  const renderRows = (): void => {
    tbody.replaceChildren();
    const query = search.value.trim().toLowerCase();
    dispatch({ type: 'SET_COURSE_QUERY', query: search.value });
    for (const course of state.courses) {
      const haystack = `${course.courseId} ${course.title} ${course.sourceTabId ?? ''}`.toLowerCase();
      if (query && !haystack.includes(query)) continue;
      tbody.append(courseRow(course, dispatch));
    }
    noMatches.hidden = tbody.childElementCount > 0;
  };

  search.addEventListener('input', renderRows);
  table.append(tbody);
  root.append(tableScroll(table), noMatches);
  renderRows();
  return root;
};

const courseRow = (course: AppState['courses'][number], dispatch: Dispatch): HTMLElement => {
  const row = el('tr');
  row.innerHTML = `<td>${course.courseId}</td><td>${escapeHtml(course.title)}</td><td>${escapeHtml(course.sourceTabLabel ?? course.sourceTabId ?? '')}</td><td></td>`;
  const archive = button('Archive', { variant: 'ghost' });
  const chapters = button('Chapters', { variant: 'secondary' });
  archive.addEventListener('click', () => navigate({ name: 'archive', courseId: String(course.courseId) }));
  chapters.addEventListener('click', async () => {
    const requestId = detailRequestId += 1;
    chapters.disabled = true;
    chapters.textContent = 'Loading…';
    try {
      const detail = await apiFetch<CourseDetail>(`/api/courses/${course.courseId}`);
      if (requestId === detailRequestId) dispatch({ type: 'SET_COURSE_DETAIL', detail });
    } catch (error) {
      if (requestId === detailRequestId) {
        dispatch({ type: 'SHOW_TOAST', message: error instanceof Error ? error.message : String(error), kind: 'error' });
      }
    } finally {
      chapters.disabled = false;
      chapters.textContent = 'Chapters';
    }
  });
  row.children[3]?.append(archive, chapters);
  return row;
};

const courseDetailPanel = (detail: CourseDetail, dispatch: Dispatch): HTMLElement => {
  const panel = el('aside', { className: 'detail-panel stack', tabindex: '-1', 'aria-labelledby': 'course-detail-title' });
  const close = button('Close', { variant: 'ghost' });
  close.addEventListener('click', () => dispatch({ type: 'SET_COURSE_DETAIL', detail: null }));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dispatch({ type: 'SET_COURSE_DETAIL', detail: null });
  });
  panel.append(
    el('div', { className: 'detail-heading' }, el('h2', { id: 'course-detail-title', text: `Chapters: ${detail.title ?? detail.courseId}` }), close),
    tableScroll(renderChapterTable(detail.chapters)),
  );
  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  return panel;
};
