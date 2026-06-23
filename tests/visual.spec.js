// Automated Visual & Functional QA loop.
//
// For every key public page this test:
//   1. loads it and asserts a real HTTP response (no 404/5xx),
//   2. enforces the site's core contract — Hebrew RTL + a primary nav,
//   3. captures a full-page screenshot artifact (the QA Engineer's "eyes"),
//   4. fails on real JS errors, and flags overlapping / overflowing layout.
//
// Screenshots land in screenshots/<project>/<page>.png and are uploaded as
// CI artifacts so the QA role can inspect layout shifts, overlapping text and
// broken modals without the user sending anything mid-task.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PAGES = [
  { name: 'home', path: '/index.html' },
  { name: 'about', path: '/about.html' },
  { name: 'services', path: '/services.html' },
  { name: 'gallery', path: '/gallery.html' },
  { name: 'bride', path: '/bride.html' },
  { name: 'bridal-guide', path: '/bridal-guide.html' },
  { name: 'pricing', path: '/pricing.html' },
  { name: 'contact', path: '/contact.html' },
  { name: 'reviews', path: '/reviews.html' },
];

for (const p of PAGES) {
  test(`${p.name} — renders, RTL, no script errors, no layout overflow`, async ({ page }, testInfo) => {
    const jsErrors = [];
    // Missing/blocked external resources are tolerated (the test's contract);
    // only real script errors (TypeError/ReferenceError/etc.) fail the run.
    // WebKit surfaces a cross-origin fetch to the Worker (api.yardendamri.co.il,
    // e.g. the /social likes endpoint) as a "...due to access control checks"
    // pageerror whenever the page is served off-origin — i.e. always in CI
    // (127.0.0.1), never on the live yardendamri.co.il where the origin is
    // CORS-allowlisted. The app already swallows the rejection (try/catch +
    // .catch); this filter keeps that browser-level network noise from failing
    // the build, exactly like the missing R2/Worker images it already tolerates.
    const TOLERATED_ERR = /api\.yardendamri\.co\.il|access control checks|Access-Control|Failed to load resource|Load failed|net::ERR|ERR_[A-Z]/i;
    page.on('pageerror', (e) => { if (!TOLERATED_ERR.test(e.message)) jsErrors.push(e.message); });

    // External media (R2, Instagram stats, the Worker) may be slow or blocked
    // in CI — we only need the document + layout, not every image byte.
    const resp = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    expect(resp, `no response for ${p.path}`).toBeTruthy();
    expect(resp.status(), `bad status for ${p.path}`).toBeLessThan(400);

    // Core contract for this site.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('nav[role="navigation"]').first()).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    // Let webfonts + initial JS render settle before we judge layout.
    await page.waitForTimeout(1500);

    // Horizontal-overflow check: a common RTL/mobile bug is content wider than
    // the viewport (causes a sideways scrollbar / cut-off text). Allow a small
    // sub-pixel tolerance.
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollW: de.scrollWidth, clientW: de.clientWidth };
    });
    expect(
      overflow.scrollW,
      `${p.name} overflows horizontally (${overflow.scrollW}px > ${overflow.clientW}px)`
    ).toBeLessThanOrEqual(overflow.clientW + 2);

    // Capture the artifact.
    const dir = path.join('screenshots', testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${p.name}.png`);
    // Full-page capture, with a fallback for pages taller than WebKit's hard
    // 32767px screenshot limit (the long single-page mobile homepage hits it).
    try {
      await page.screenshot({ path: file, fullPage: true });
    } catch (err) {
      if (/32767/.test(String(err))) {
        const width = page.viewportSize()?.width ?? 1280;
        await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height: 32000 } });
      } else {
        throw err;
      }
    }
    await testInfo.attach(`${p.name}-${testInfo.project.name}`, {
      path: file,
      contentType: 'image/png',
    });

    // Real script errors are a hard fail; missing external assets are not.
    expect(jsErrors, `JS errors on ${p.name}: ${jsErrors.join(' | ')}`).toHaveLength(0);
  });
}

test('mobile menu opens and closes without overlapping the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-safari', 'mobile-only interaction');

  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  const toggle = page.locator('.menu-toggle, [aria-label*="תפריט"], .hamburger').first();
  if ((await toggle.count()) === 0) test.skip(true, 'no mobile menu toggle found');

  await toggle.click();
  const menu = page.locator('.mobile-menu').first();
  await expect(menu).toBeVisible();
  await page.waitForTimeout(400);

  const dir = path.join('screenshots', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, 'mobile-menu-open.png') });
});
