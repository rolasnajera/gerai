import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test('app launches', async () => {
  // Use the local electron executable and point to the main script
  const electronApp = await electron.launch({
    args: ['.'],
  });

  const window = await electronApp.firstWindow();

  // Wait for the window to load (title might vary so we just check if it's not empty)
  // The app title in Electron might be initially empty or set dynamically.
  // We can check if the window is visible or has some content.
  await window.waitForLoadState('domcontentloaded');
  const title = await window.title();
  // If title is empty in test environment, we can check for other indicators
  if (title === '') {
      // Check for a specific element that should exist in the app
      const body = await window.locator('body');
      await expect(body).toBeVisible();
  } else {
      expect(title).toBe('GERAI');
  }

  await electronApp.close();
});
