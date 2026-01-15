import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // We will configure the electron launcher in the test itself or use a custom launcher script if needed,
        // but typically for Electron we use the _electron fixture from playwright.
      },
    },
  ],
});
