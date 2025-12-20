import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import type { StoredSession } from '../session/sessionStore.js';

export type CourseListItem = {
  courseId: number;
  title: string;
};

export async function scrapeMyCourses(params: {
  session: StoredSession;
  headless: boolean;
}): Promise<CourseListItem[]> {
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

    const url = 'https://www.nnn.ed.nico/my_course?tab=zen_univ';
    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.content();
    const $ = cheerio.load(html);

    const items: CourseListItem[] = [];
    const seen = new Set<number>();

    $('a[href*="/courses/"]').each((_i, el) => {
      const href = $(el).attr('href') ?? '';
      const m = href.match(/\/courses\/(\d+)/);
      if (!m) return;
      const courseId = Number(m[1]);
      if (!Number.isFinite(courseId) || seen.has(courseId)) return;
      seen.add(courseId);
      const title = ($(el).text() || '').trim();
      items.push({ courseId, title: title || `course-${courseId}` });
    });

    return items;
  } finally {
    await browser.close();
  }
}
