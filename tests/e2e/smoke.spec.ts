import { expect, type Page, test } from '@playwright/test';

// SPEC §11 / SPEC-homepage §9 smoke tests, against the production build.
// Game coordinates are the 640×360 grid (the canvas is 3× that, D-040), scaled to fit; game coordinates are converted to page clicks.

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

test('first launch: tap to start, School ID, map, ride to PUP, Lagoon, pause, back', async ({
  page,
}) => {
  // The full flow (ride, walk to the karinderya, reload) takes ~30 s; give it room on slow machines.
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await page.goto('./');
  await waitForScene(page, 'Landing');

  await tap(page, 320, 250); // Tap to start
  await page.waitForTimeout(700);
  // H2 surprises: parked jeepney, barker, cart, print shop, cat. They must never block or error.
  for (const [x, y] of [
    [200, 330],
    [146, 306],
    [566, 300],
    [194, 250],
    [232, 297],
  ]) {
    await tap(page, x, y);
  }
  await page.waitForTimeout(300);
  await tap(page, 320, 146); // LET'S PLAY!
  await waitForScene(page, 'IdCard');
  await page.waitForTimeout(400);
  await tap(page, 420, 123); // Boy
  await page.getByTestId('id-name').fill('Ana');
  await tap(page, 426, 267); // Done!
  await waitForScene(page, 'CampusMap');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('uni-series-save') ?? '{}').profile?.name,
    ),
  ).toBe('Ana');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('uni-series-save') ?? '{}').profile?.gender,
    ),
  ).toBe('boy');

  await page.waitForTimeout(500);
  await tap(page, 555, 244); // PUP pin
  await page.waitForTimeout(400);
  await tap(page, 360, 331); // Ride!
  await waitForScene(page, 'LagoonIntroScene'); // the Vacant card
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter'); // Tara!
  await waitForScene(page, 'LagoonMap');
  await page.waitForTimeout(500);

  // L2: open the karinderya menu board (key 1), Pumila (Enter), walk there and join the line.
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  const location = (): Promise<string | null> =>
    page.evaluate(() => {
      const game = (window as unknown as { __uniGame: { scene: { getScene(k: string): unknown } } })
        .__uniGame;
      const scene = game.scene.getScene('LagoonMap') as {
        vacant: { location: { stall: string } | null };
      };
      return scene.vacant.location?.stall ?? null;
    });
  await expect.poll(location, { timeout: 15_000 }).toBe('karinderya');
  await page.keyboard.press('Escape'); // leave the line
  await expect.poll(location).toBeNull();

  await page.keyboard.press('p'); // pause
  await waitForScene(page, 'Pause');
  await tap(page, 320, 216); // Back to map
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
