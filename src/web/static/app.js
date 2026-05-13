const $ = (id) => document.getElementById(id);
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const TOKEN_STORAGE_KEY = 'zenbukko.webToken';
const webToken = loadWebToken();
let eventSource;

async function api(path, options) {
  const res = await fetch(path, withToken(options));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function refreshStatus() {
  const s = await api('/api/status');
  $('status').textContent = 'Session: ' + (s.sessionExists ? 'ready' : 'missing') + ' | Gemini: ' + (s.geminiConfigured ? 'configured' : 'missing key') + ' | Output: ' + s.outputDir;
}

async function loadSession() {
  const data = await api('/api/session');
  if (data.text) $('sessionInput').value = data.text;
}

async function loadSettings() {
  const data = await api('/api/settings');
  const s = data.settings || {};
  $('geminiApiKey').value = s.geminiApiKey || '';
  $('geminiModel').value = s.geminiModel || DEFAULT_GEMINI_MODEL;
  $('ocrBackend').value = s.ocrBackend || 'auto';
  $('ocrMode').value = s.ocrMode || 'auto';
  $('ocrServiceTier').value = s.ocrServiceTier || 'flex';
  $('ndlocrCommand').value = s.ndlocrCommand || 'ndlocr-lite';
  $('ndlocrDevice').value = s.ndlocrDevice || 'cpu';
  $('ocrPageDpi').value = s.ocrPageDpi || 300;
  $('ocrKeepIntermediates').checked = Boolean(s.ocrKeepIntermediates);
  $('ndlocrEnableTcy').checked = s.ndlocrEnableTcy !== false;
  $('chapterRange').value = s.chapterRange || '';
}

async function refreshJobs() {
  const data = await api('/api/jobs');
  $('jobs').innerHTML = data.jobs.map(jobRow).join('');
  document.querySelectorAll('[data-job]').forEach((btn) => btn.addEventListener('click', () => openJob(btn.dataset.job)));
}

async function openJob(id) {
  if (eventSource) eventSource.close();
  await api('/api/jobs/' + id);
  $('log').textContent = '';
  eventSource = new EventSource(eventUrl(id));
  eventSource.onmessage = (ev) => {
    $('log').textContent += JSON.parse(ev.data) + '\n';
    $('log').scrollTop = $('log').scrollHeight;
    refreshJobs().catch(console.error);
  };
}

async function loadCourses() {
  const data = await api('/api/courses');
  $('courses').innerHTML = data.courses.map(courseRow).join('');
  document.querySelectorAll('[data-course]').forEach((btn) => {
    btn.addEventListener('click', () => { $('learningUrl').value = 'https://www.nnn.ed.nico/courses/' + btn.dataset.course; });
  });
}

async function createJob(kind, request) {
  const data = await api('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...request }),
  });
  await refreshJobs();
  await openJob(data.job.id);
}

$('saveSession').onclick = async () => {
  await api('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: $('sessionInput').value }),
  });
  await refreshStatus();
};

$('loadCourses').onclick = () => loadCourses().catch(alertError);
$('startDownload').onclick = () => createJob('download', collectDownload()).catch(alertError);
$('startOcr').onclick = () => createJob('ocr-materials', { inputDir: $('ocrInput').value, ocrForce: false, ...collectSettings() }).catch(alertError);
$('saveSettings').onclick = async () => {
  await api('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: collectSettings(true) }),
  });
  await refreshStatus();
};

function collectDownload() {
  return {
    learningUrl: $('learningUrl').value,
    chapterRange: $('chapterRange').value,
    chapters: $('chapters').value,
    lessonIds: $('lessonIds').value,
    maxConcurrency: $('maxConcurrency').value,
    transcribe: $('transcribe').checked,
    materials: $('materials').checked,
    ocrMaterials: $('ocrMaterials').checked,
    ...collectSettings(),
    deleteMediaAfterTranscribe: $('cleanup').checked,
  };
}

function collectSettings(includeSecret) {
  const settings = {
    ocrBackend: $('ocrBackend').value,
    geminiModel: $('geminiModel').value,
    ocrMode: $('ocrMode').value,
    ocrServiceTier: $('ocrServiceTier').value,
    ndlocrCommand: $('ndlocrCommand').value,
    ndlocrDevice: $('ndlocrDevice').value,
    ocrPageDpi: Number($('ocrPageDpi').value || 300),
    ocrKeepIntermediates: $('ocrKeepIntermediates').checked,
    ndlocrEnableTcy: $('ndlocrEnableTcy').checked,
    chapterRange: $('chapterRange').value,
  };
  if (includeSecret) settings.geminiApiKey = $('geminiApiKey').value;
  return settings;
}

function courseRow(c) {
  return '<tr><td><button class="secondary" data-course="' + c.courseId + '">' + c.courseId + '</button></td><td>' + escapeHtml(c.title) + '</td><td>' + escapeHtml(c.sourceTabId || '') + '</td></tr>';
}

function jobRow(j) {
  return '<tr><td><button class="secondary" data-job="' + j.id + '">' + j.id + '</button></td><td>' + escapeHtml(j.title) + '</td><td>' + j.status + '</td><td>' + j.updatedAt + '</td></tr>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function alertError(e) {
  alert(e.message || String(e));
}

function loadWebToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token') || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  if (url.searchParams.has('token')) {
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return token;
}

function withToken(options) {
  const next = { ...(options || {}) };
  const headers = new Headers(next.headers || {});
  if (webToken) headers.set('X-Zenbukko-Token', webToken);
  next.headers = headers;
  return next;
}

function eventUrl(id) {
  const url = new URL('/api/jobs/' + id + '/events', window.location.origin);
  if (webToken) url.searchParams.set('token', webToken);
  return url.pathname + url.search;
}

refreshStatus().catch(console.error);
loadSession().catch(console.error);
loadSettings().catch(console.error);
refreshJobs().catch(console.error);
