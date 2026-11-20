import { expect, test } from '@playwright/test';

// SPEC §11 smoke test. M1 adds: Title renders, a tap reaches the Hub; M2: PUP stop opens the intro.
test('boots with a canvas and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('./');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(1000); // let the first scene run a few frames
  expect(errors).toEqual([]);
});
