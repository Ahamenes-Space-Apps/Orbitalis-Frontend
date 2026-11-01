import { expect, test } from '@playwright/test';

// These tests use the built-in sky view (?renderer=svg) so they do not depend on Aladin Lite's network tiles.

test('explorer: queue, time slider and selection', async ({ page }) => {
  await page.goto('/?renderer=svg');
  const queue = page.getByRole('list', { name: 'Ranked candidates' });
  await expect(queue.getByRole('button').first()).toContainText('#042');

  await page.getByRole('button', { name: 'Show Epoch 3' }).click();
  await expect(page.getByTestId('epoch-label')).toContainText('Epoch 3 of 3');

  await queue.getByRole('button', { name: /#017/ }).click();
  await expect(page.getByTestId('selected-summary')).toContainText('Candidate #017');
});

test('dossier: charts render and the honesty banner is shown', async ({ page }) => {
  await page.goto('/?renderer=svg');
  await page.getByRole('link', { name: 'Open dossier' }).click();
  await expect(page.getByRole('heading', { name: 'Candidate #042' })).toBeVisible();
  await expect(page.getByText('warrants investigation')).toBeVisible();
  await expect(page.locator('.uplot canvas').first()).toBeVisible();
  await expect(page.locator('[aria-label^="Sky-plane track"] svg').first()).toBeVisible();
  await expect(page.getByText(/Possible explanations include/)).toBeVisible();
});

test('candidates: moving a weight re-ranks the list', async ({ page }) => {
  await page.goto('/candidates');
  const rows = page.getByTestId('candidate-row');
  await expect(rows).toHaveCount(31);
  await expect(rows.first()).toContainText('#042');

  // Keyboard: push the motion weight to its maximum and the others to zero.
  for (const [name, key] of [
    ['Weight for Motion significance', 'End'],
    ['Weight for Brightness variation', 'Home'],
    ['Weight for Spectral anomaly', 'Home'],
    ['Weight for Temporal consistency', 'Home'],
  ] as const) {
    const thumb = page.getByRole('slider', { name });
    await thumb.focus();
    await thumb.press(key);
  }
  await expect(rows.first()).not.toContainText('#042');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(rows.first()).toContainText('#042');
});

test('methods page shows limits', async ({ page }) => {
  await page.goto('/methods');
  await expect(page.getByText('A candidate is not a detection.')).toBeVisible();
  await expect(page.getByTestId('planted-rank')).toContainText('ranks 1 of 31');
});
