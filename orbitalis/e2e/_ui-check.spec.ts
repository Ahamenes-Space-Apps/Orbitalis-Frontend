import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1000 }, channel: 'chrome' });

test('desktop pages render without console errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  const shots = 'C:/Users/tensa/AppData/Local/Temp/opencode';

  await page.goto('/?renderer=svg');
  await expect(page.getByText('Candidate Detection')).toBeVisible();
  await expect(page.getByText('Investigation Dossier')).toBeVisible();
  await expect(page.getByText('Spectral Explorer Tray')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/orbitalis-explorer.png`, fullPage: false });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.goto('/spectral?renderer=svg');
  await expect(page.getByText('SPECTRAL EXPLORER')).toBeVisible();
  await expect(page.getByText('Sampled Channel Comparison')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/orbitalis-spectral.png`, fullPage: false });

  await page.goto('/candidates/42?renderer=svg');
  await expect(page.getByText('Investigation Dossier')).toBeVisible();
  await expect(page.getByText('Temporal Difference Cutout')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/orbitalis-dossier.png`, fullPage: false });

  await page.goto('/architecture');
  await expect(page.getByText('SYSTEM ARCHITECTURE')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/orbitalis-architecture.png`, fullPage: false });

  expect(errors).toEqual([]);
});
