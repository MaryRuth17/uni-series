import { expect, type Page, test } from '@playwright/test';

// SPEC §11 / SPEC-homepage §9 smoke tests, against the production build.
// The canvas is 640×360 scaled to fit; game coordinates are converted to page clicks.

async function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const game = (
      window as unknown as {
        __uniGame?: { scene: { getScenes(active: boolean): { scene: { key: string } }[] } };
      }
    ).__uniGame;
    return game ? game.scene.getScenes(true).map((s) => s.scene.key) : [];
  });
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await expect.poll(() => activeScenes(page), { timeout: 10_000 }).toContain(key);
}

async function tap(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.click(box.x + (x * box.width) / 640, box.y + (y * box.height) / 360);
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('boots to the Landing screen with no console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  await expect(page.locator('#game canvas')).toBeVisible();
  await waitForScene(page, 'Landing');
  expect(errors).toEqual([]);
});

test('first launch: tap to start, School ID, map, ride to PUP, placeholder, back', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('./');
  await waitForScene(page, 'Landing');

  await tap(page, 320, 250); // "Pindutin para magsimula"
  await page.waitForTimeout(700);
  await tap(page, 320, 146); // TARA, LARO!
  await waitForScene(page, 'IdCard');
  await page.waitForTimeout(400);
  await page.getByTestId('id-name').fill('Ana');
  await tap(page, 380, 246); // Ayos na!
  await waitForScene(page, 'CampusMap');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('uni-series-save') ?? '{}').profile?.name,
    ),
  ).toBe('Ana');

  await page.waitForTimeout(500);
  await tap(page, 555, 244); // PUP pin
  await page.waitForTimeout(400);
  await tap(page, 360, 331); // Sakay na!
  await waitForScene(page, 'ComingSoon');
  await page.waitForTimeout(500);
  await tap(page, 320, 212); // Balik
  await waitForScene(page, 'CampusMap');

  // A returning player skips the School ID.
  await page.reload();
  await waitForScene(page, 'Landing');
  await tap(page, 320, 250);
  await page.waitForTimeout(700);
  await tap(page, 320, 146);
  await waitForScene(page, 'CampusMap');
  expect(errors).toEqual([]);
});
