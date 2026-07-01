import type { Route } from '../state/types.js';

export const parseHash = (hash: string): Route => {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const query = new URLSearchParams(queryPart ?? '');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length === 0) return { name: 'dashboard' };
  if (segments[0] === 'session') return { name: 'session' };
  if (segments[0] === 'courses') return { name: 'courses' };
  if (segments[0] === 'archive') return { name: 'archive', courseId: query.get('courseId') ?? undefined };
  if (segments[0] === 'outputs') return { name: 'outputs' };
  if (segments[0] === 'settings') return { name: 'settings' };
  if (segments[0] === 'jobs') {
    return segments[1] ? { name: 'jobs', jobId: segments[1] } : { name: 'jobs' };
  }
  return { name: 'dashboard' };
};

export const routeToHash = (route: Route): string => {
  switch (route.name) {
    case 'dashboard':
      return '#/';
    case 'session':
      return '#/session';
    case 'courses':
      return '#/courses';
    case 'archive':
      return route.courseId ? `#/archive?courseId=${encodeURIComponent(route.courseId)}` : '#/archive';
    case 'jobs':
      return route.jobId ? `#/jobs/${encodeURIComponent(route.jobId)}` : '#/jobs';
    case 'outputs':
      return '#/outputs';
    case 'settings':
      return '#/settings';
  }
};

export const navigate = (route: Route): void => {
  const next = routeToHash(route);
  if (window.location.hash !== next) window.location.hash = next;
};
