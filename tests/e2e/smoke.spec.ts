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
  // Session only (D-052): the profile is in memory, and nothing is written to localStorage.
  const profile = (): Promise<{ name?: string; gender?: string } | null> =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __uniSave: () => { profile: { name: string; gender: string } | null };
          }
        ).__uniSave().profile,
    );
  expect((await profile())?.name).toBe('Ana');
  expect((await profile())?.gender).toBe('boy');
  expect(await page.evaluate(() => localStorage.getItem('uni-series-save'))).toBeNull();

  await page.waitForTimeout(500);
  await tap(page, 555, 244); // PUP pin
  await page.waitForTimeout(400);
  await tap(page, 360, 331); // Ride!
  // L6: the PUP intro (Enter skips the pan), then How to play (Enter = Got it!).
  await waitForScene(page, 'LagoonOpening');
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'LagoonIntroScene'); // the Vacant card
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter'); // Tara!
  await waitForScene(page, 'LagoonStalls');
  await page.waitForTimeout(500);

  // L3: no pila, every stall open. At the karinderya counter, add the first meal (tap its menu row),
  // pay with Smart pay, and check the money moved and the listahan ticked.
  const state = (): Promise<{
    stall: string | null;
    spent: number;
    tray: number;
    wallet: number;
  }> =>
    page.evaluate(() => {
      const game = (window as unknown as { __uniGame: { scene: { getScene(k: string): unknown } } })
        .__uniGame;
      const scene = game.scene.getScene('LagoonStalls') as {
        vacant: {
          location: { stall: string } | null;
          spent: number;
          currentOrder: unknown[];
          wallet: { total: number };
        };
      };
      const v = scene.vacant;
      return {
        stall: v.location?.stall ?? null,
        spent: v.spent,
        tray: v.currentOrder.length,
        wallet: v.wallet.total,
      };
    });
  await page.keyboard.press('ArrowRight'); // the tusok cart (FEWA)
  await page.keyboard.press('ArrowLeft'); // back to the karinderya
  await expect.poll(async () => (await state()).stall).toBe('karinderya');
  await tap(page, 129, 255); // the first menu row: a rice meal
  await expect.poll(async () => (await state()).tray).toBe(1);
  await page.keyboard.press('b'); // Bayad
  await page.waitForTimeout(300);
  await page.keyboard.press('s'); // Smart pay
  await page.keyboard.press('Enter'); // Heto po!
  await expect.poll(async () => (await state()).spent).toBeGreaterThan(0);
  // The tutorial baon cannot also buy the tusok line after a ₱70 meal: game over (owner rule), then start over.
  await waitForScene(page, 'LagoonResult');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter'); // Start over
  await waitForScene(page, 'LagoonIntroScene');
  await page.keyboard.press('Escape'); // back to the campus map
  await waitForScene(page, 'CampusMap');

  // Nothing is kept once the website is closed (D-052): after a reload the School ID is made again.
  await page.reload();
  await waitForScene(page, 'Landing');
  await tap(page, 320, 250);
  await page.waitForTimeout(700);
  await tap(page, 320, 146);
  await waitForScene(page, 'IdCard');
  expect(errors).toEqual([]);
});
