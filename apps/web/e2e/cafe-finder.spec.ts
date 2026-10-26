import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Map tiles are decoration here; blocking them keeps tests fast and offline-safe. */
async function blockMapTiles(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
}

test.beforeEach(async ({ page }) => {
  await blockMapTiles(page);
});

test('search → swipe → save → map, in demo mode', async ({ page, isMobile }) => {
  await page.goto('./?demo');
  await expect(page.getByText(/demo mode/i)).toBeVisible();

  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByRole('heading', { name: /10 cafés within 1.5 km/ })).toBeVisible();

  // Save the first café by dragging the card to the right (tapping Save on phones).
  const first = page.getByRole('article', { name: 'Copper Kettle' });
  await expect(first).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  } else {
    // The page smooth-scrolls to the results, so hover first: Playwright waits until the
    // card stops moving. Grab it by its padding, since drags don't start on links.
    await first.hover({ position: { x: 12, y: 12 } });
    const box = (await first.boundingBox())!;
    const [x, y] = [box.x + 12, box.y + 12];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 220, y, { steps: 10 });
    await page.mouse.up();
  }
  await expect(page.getByRole('article', { name: 'Night Owl Espresso' })).toBeVisible();

  // Keyboard: skip, undo the skip, then save.
  await page.getByRole('group', { name: /café cards/i }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('article', { name: 'Little Fika' })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('article', { name: 'Night Owl Espresso' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('article', { name: 'Little Fika' })).toBeVisible();

  // Both saved cafés are listed and drawn on the map (plus the search start marker).
  await page.getByRole('link', { name: /saved 2/i }).click();
  const saved = page.getByRole('region', { name: /saved cafés/i });
  await expect(saved.getByRole('heading', { level: 3 })).toHaveText([
    'Night Owl Espresso',
    'Copper Kettle',
  ]);
  await expect(saved.locator('path.leaflet-interactive')).toHaveCount(3);

  // Saved cafés survive a reload.
  await page.reload();
  await expect(saved.getByRole('heading', { level: 3 })).toHaveCount(2);
});

test('searches a typed place against OpenStreetMap (mocked)', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      json: [{ lat: '60.1699', lon: '24.9384', display_name: 'Helsinki, Finland' }],
    }),
  );
  await page.route('https://overpass-api.de/**', (route) =>
    route.fulfill({
      json: {
        elements: [
          { type: 'node', id: 1, lat: 60.1702, lon: 24.9388, tags: { name: 'Andante' } },
          { type: 'way', id: 2, center: { lat: 60.172, lon: 24.94 }, tags: { name: 'Kaffa' } },
        ],
      },
    }),
  );

  await page.goto('./');
  await page.getByLabel('City or address').fill('Helsinki');
  await page.getByLabel('City or address').press('Enter');

  await expect(
    page.getByRole('heading', { name: '2 cafés within 1.5 km of Helsinki, Finland' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Map & list' }).click();
  const results = page.getByRole('region', { name: /cafés within/ });
  await expect(results.getByRole('heading', { level: 3 })).toHaveText(['Andante', 'Kaffa']);
  await expect(results.locator('path.leaflet-interactive')).toHaveCount(3);
});

test('falls back to search when location access is denied', async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto('./');
  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByRole('alert')).toContainText('Search for a city or address instead');
});

test('has no detectable accessibility violations', async ({ page }) => {
  await page.goto('./?demo');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByRole('article', { name: 'Copper Kettle' })).toBeVisible();
  await page.keyboard.press('Tab'); // make sure focus styles don't hide anything

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Leaflet's own attribution control and tiles are third-party markup.
    .exclude('.leaflet-control-container')
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
