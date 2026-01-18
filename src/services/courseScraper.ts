import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import type { StoredSession } from '../session/sessionStore.js';

export type CourseListItem = {
  courseId: number;
  title: string;
  // Best-effort signal based on the course list UI. Used by bulk commands.
  isOnDemand?: boolean;
  onDemandReason?: string;
  sourceTabId?: string;
  sourceTabLabel?: string;
};

export type CourseListItemDetailed = Required<Pick<CourseListItem, 'courseId' | 'title'>> &
  Pick<CourseListItem, 'isOnDemand' | 'onDemandReason' | 'sourceTabId' | 'sourceTabLabel'>;

function normalizeWhitespace(s: string): string {
  return s.replaceAll(/\s+/g, ' ').trim();
}

function looksOnDemandLabel(label: string): boolean {
  const t = normalizeWhitespace(label);
  return /オンデマンド/i.test(t) || /on\s*-?\s*demand/i.test(t);
}

function looksOnDemandTabId(tabId: string): boolean {
  // Repo historically uses tab=zen_univ for on-demand course list.
  const t = tabId.trim();
  return /zen_univ/i.test(t);
}

export async function scrapeMyCoursesDetailed(params: {
  session: StoredSession;
  headless: boolean;
}): Promise<CourseListItemDetailed[]> {
  const browser = await puppeteer.launch({
    headless: params.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    if (params.session.userAgent) {
      await page.setUserAgent(params.session.userAgent);
    }

    // Apply cookies for the www domain.
    const cookies = params.session.cookies
      .map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      }))
      .filter((c) => c.name && c.value);

    // Puppeteer requires a URL for cookies that don't specify domain.
    await page.goto('https://www.nnn.ed.nico/', { waitUntil: 'domcontentloaded' });
    // @ts-expect-error puppeteer cookie typing varies by version
    await page.setCookie(...cookies);

    const baseUrl = 'https://www.nnn.ed.nico/my_course';
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });

    const tabs = await page.evaluate(() => {
      const out: Array<{ tabId: string; label: string; href: string }> = [];
      const doc = (globalThis as unknown as { document?: { querySelectorAll: (sel: string) => unknown } }).document;
      const raw = (doc?.querySelectorAll?.('a[href*="my_course?tab="]') as unknown) ?? [];
      const anchors = Array.from(raw as ArrayLike<unknown>);
      for (const a of anchors) {
        const node = (a ?? {}) as Record<string, unknown>;
        const getAttribute =
          typeof node.getAttribute === 'function'
            ? (node.getAttribute as unknown as (name: string) => string | null)
            : undefined;
        const href = (getAttribute ? getAttribute('href') : '') ?? '';
        const m = href.match(/[?&]tab=([^&#]+)/);
        if (!m) continue;
        const tabId = decodeURIComponent(m[1] ?? '').trim();
        if (!tabId) continue;
        const tc = node.textContent;
        const label = (typeof tc === 'string' ? tc : '').trim();
        out.push({ tabId, label, href });
      }
      // Deduplicate by tabId while keeping first label.
      const seen = new Set<string>();
      const dedup: Array<{ tabId: string; label: string }> = [];
      for (const t of out) {
        if (seen.has(t.tabId)) continue;
        seen.add(t.tabId);
        dedup.push({ tabId: t.tabId, label: t.label });
      }
      return dedup;
    });

    const effectiveTabs = tabs.length > 0 ? tabs : [{ tabId: 'zen_univ', label: '' }];

    const items: CourseListItemDetailed[] = [];
    const seenCourseIds = new Set<number>();

    for (const tab of effectiveTabs) {
      const url = `${baseUrl}?tab=${encodeURIComponent(tab.tabId)}`;
      // eslint-disable-next-line no-await-in-loop
      await page.goto(url, { waitUntil: 'networkidle2' });
      // eslint-disable-next-line no-await-in-loop
      const html = await page.content();
      const $ = cheerio.load(html);

      $('a[href*="/courses/"]').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        const m = href.match(/\/courses\/(\d+)/);
        if (!m) return;
        const courseId = Number(m[1]);
        if (!Number.isFinite(courseId) || seenCourseIds.has(courseId)) return;
        seenCourseIds.add(courseId);

        const rawTitle = ($(el).text() || '').trim();
        const title = normalizeWhitespace(rawTitle) || `course-${courseId}`;

        const tabLabel = normalizeWhitespace(tab.label ?? '');

        // Heuristics:
        // - If the tab label looks like "オンデマンド" => true.
        // - Else if tabId is the historical on-demand tab => true.
        // - Else check nearby card text for "オンデマンド".
        const nearbyText = normalizeWhitespace($(el).closest('li,div,section,article').text() || '');

        const byLabel = tabLabel ? looksOnDemandLabel(tabLabel) : false;
        const byTabId = looksOnDemandTabId(tab.tabId);
        const byNearby = nearbyText ? /オンデマンド/i.test(nearbyText) : false;

        const isOnDemand = byLabel || byTabId || byNearby;
        const reasons: string[] = [];
        if (byLabel) reasons.push('tab-label');
        if (byTabId) reasons.push('tab-id');
        if (byNearby) reasons.push('card-text');

        const item: CourseListItemDetailed = {
          courseId,
          title,
          isOnDemand,
          sourceTabId: tab.tabId,
        };
        if (reasons.length > 0) item.onDemandReason = reasons.join(',');
        if (tabLabel) item.sourceTabLabel = tabLabel;
        items.push(item);
      });
    }

    return items;
  } finally {
    await browser.close();
  }
}

export async function scrapeMyCourses(params: {
  session: StoredSession;
  headless: boolean;
}): Promise<CourseListItem[]> {
  const detailed = await scrapeMyCoursesDetailed(params);
  return detailed.map((c) => ({ courseId: c.courseId, title: c.title }));
}
