// Playwright config — automated visual + functional QA for yardendamri.co.il
// The site is a static GitHub Pages site (no build step), so we serve the repo
// root with a tiny static server and point the browsers at it.
// Override the target with BASE_URL (e.g. the live site) when needed.
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || 4173;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  // The two engines that matter for this project: desktop Chrome + iPhone
  // Safari (WebKit) — iOS Safari is where most of the site's bugs have lived.
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Only spin up the local static server when we are NOT pointing at an
  // external BASE_URL (the live site or a deploy preview).
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx http-server . -p ${PORT} -c-1 --silent`,
        url: `${BASE_URL}/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
