import { expect, test } from '@playwright/test';

const TUTORIAL = 'f_25faaae4bee9c18ab8c3ce82';
const VALIDATION_JOB = 'j_c344fe2f3dc5878fa8b2f42f';

const BANNED = [/\bconfirmed\b/i, /\bdiscovery\b/i, /\bconfidence\b/i, /found a planet/i, /\bfalse positive\b/i];

async function expectNoBannedCopy(page: import('@playwright/test').Page) {
  const text = await page.locator('body').innerText();
  for (const pattern of BANNED) expect(text).not.toMatch(pattern);
}

test('landing lists real-data presets and opens the explorer', async ({ page }) => {
  await page.goto('/explorer');

  await expect(page.getByRole('heading', { name: 'Choose a patch of sky' })).toBeVisible();
  for (const name of ['tutorial', 'barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aur', 'r-dra']) {
    await expect(page.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
  }
  await expect(page.getByText(/Mock API · Demo data/)).toBeVisible();
  await expectNoBannedCopy(page);

  await page.getByRole('button', { name: /tutorial/i }).click();

  await expect(page.getByTestId('field-chip')).toBeVisible();
  await expect(page.getByText('5 frames · 10 candidates')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Frame scrubber' })).toBeVisible();
  // Mock mode has no chat transport, so even a capability snapshot cannot
  // produce a dead assistant control.
  await expect(page.getByRole('button', { name: /ask the assistant/i })).toHaveCount(0);
});

test('cinematic landing opens the observer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { name: /see what/i })).toBeVisible();
  await expectNoBannedCopy(page);
  await page.getByRole('button', { name: 'Open the Explorer' }).click();
  await expect(page).toHaveURL(/\/explorer\?ra=/);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('explorer scrubber, queue and candidate drawer', async ({ page }) => {
  await page.goto(`/explorer?f=${TUTORIAL}`);

  const queue = page.getByRole('list', { name: 'Ranked candidates' });
  await expect(queue.getByRole('button').first()).toBeVisible();
  await expect(page.getByTestId('queue-subtitle')).toContainText('Ranked by stack SNR');

  await page.getByRole('button', { name: 'Next frame' }).click();
  await expect(page.getByRole('button', { name: /Show frame 2 of 5/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const first = queue.getByRole('button').first();
  await first.click();
  await expect(page.getByRole('heading', { name: 'Stack versus originals' })).toBeVisible();
  await expect(page.getByText('Unconfirmed').first()).toBeVisible();
  await expect(page).toHaveURL(/sel=/);
  await expectNoBannedCopy(page);

  await page.getByRole('button', { name: 'Close candidate detail' }).click();
  await expect(page.getByRole('heading', { name: 'Stack versus originals' })).toBeHidden();
  await expect(page).toHaveURL(/sel=/);

  // Selection survives closing: choosing the same row reopens the drawer.
  await first.click();
  await expect(page.getByRole('heading', { name: 'Stack versus originals' })).toBeVisible();
});

test('candidates estimate and replay a stored run', async ({ page }) => {
  await page.goto(`/candidates?f=${TUTORIAL}`);

  await expect(page.getByRole('heading', { name: 'Run a moving-object search' })).toBeVisible();
  await expect(page.getByText('Within the work budget.')).toBeVisible({ timeout: 15_000 });

  // Ranking is disabled by /capabilities, so no rank control is rendered.
  await expect(page.getByLabel('Rank after search')).toHaveCount(0);
  await expect(page.getByText(/ordered by stack SNR/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Run search' }).click();
  await expect(page.getByText('Showing results from an earlier identical run.')).toBeVisible();
  await expectNoBannedCopy(page);
});

test('the dossier restores the full candidate page with live sections', async ({ page }) => {
  await page.goto('/candidates/c_8903f6dec3d85ec2624e925e?f=' + TUTORIAL);

  await expect(page.getByRole('heading', { name: /Candidate #001/ })).toBeVisible();
  await expect(page.getByText('Unconfirmed').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stack versus originals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Motion' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Light curve' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spectral energy distribution' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wavelength coverage' })).toBeVisible();
  await expect(page.getByText(/read-only · from stored frames/i)).toBeVisible();
  await expect(page.getByText(/quick-look SED/)).toBeVisible();
  await expect(page.getByRole('button', { name: /export report/i })).toBeVisible();
  await expectNoBannedCopy(page);
});

test('candidates asks for a field when the URL has none', async ({ page }) => {
  await page.goto('/candidates');

  await expect(page.getByRole('heading', { name: 'Choose a field first' })).toBeVisible();
  await expect(page.getByRole('button', { name: /tutorial/i })).toBeVisible();
  await expectNoBannedCopy(page);
});

test('methods uses real validation evidence and reruns stored settings', async ({ page }) => {
  await page.goto(`/methods?f=${TUTORIAL}`);

  await expect(page.getByRole('heading', { name: 'How the search works' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Validation' })).toBeVisible();
  await expect(page.getByText(/not a calibrated probability/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Run validation with these settings' }).click();
  await expect(page.getByText(VALIDATION_JOB)).toBeVisible();
  await expectNoBannedCopy(page);
});

test('a stale field id offers a rebuild from URL parameters', async ({ page }) => {
  await page.goto(`/?f=f_missing&ra=156.09&dec=-41.64&r=0.1&rel=qr2`);

  await expect(page.getByText("We can't find that item.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rebuild this view' })).toBeVisible();
});
