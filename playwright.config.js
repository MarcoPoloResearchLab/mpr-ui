// @ts-check

const { defineConfig } = require('@playwright/test');

const OPTIONAL_LIVE_DEMO_SPECS = [
  'demo-stack.spec.js',
  'entity-workspace-demo.spec.js',
];
const hasLiveDemoBaseUrl =
  typeof process.env.MPR_UI_DEMO_BASE_URL === 'string' &&
  process.env.MPR_UI_DEMO_BASE_URL.trim() !== '';
const LOCAL_DEMO_BASE_URL = 'http://127.0.0.1:4177';

module.exports = defineConfig({
  testDir: 'tests/e2e',
  testIgnore: hasLiveDemoBaseUrl ? [] : OPTIONAL_LIVE_DEMO_SPECS,
  timeout: 30000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  webServer: hasLiveDemoBaseUrl
    ? undefined
    : {
        command: 'npm run demo:serve',
        url: LOCAL_DEMO_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0,
  },
});
