import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './render';

const TUTORIAL = 'f_25faaae4bee9c18ab8c3ce82';
const VALIDATION_JOB = 'j_c344fe2f3dc5878fa8b2f42f';
const PRESETS = ['tutorial', 'barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aur', 'r-dra'];

/**
 * UX §12 bans claims the pipeline cannot make. "Unconfirmed" is required copy,
 * so the check uses word boundaries around "confirmed".
 */
function expectNoBannedCopy() {
  const text = document.body.textContent ?? '';
  expect(text).not.toMatch(/\bconfirmed\b/i);
  expect(text).not.toMatch(/\bdiscovery\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/found a planet/i);
  expect(text).not.toMatch(/\bfalse positive\b/i);
}

describe('landing', () => {
  it('offers the six real-data presets and says it is mock data', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: /choose a patch of sky/i }),
    ).toBeInTheDocument();
    for (const name of PRESETS) {
      expect(await screen.findByRole('button', { name: new RegExp(name, 'i') })).toBeInTheDocument();
    }
    expect(screen.getByText(/mock api/i)).toBeInTheDocument();
    expectNoBannedCopy();
  });

  it('opens a preset into the explorer and keeps the field in the URL', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: /tutorial/i }));

    expect(await screen.findByTestId('field-chip')).toBeInTheDocument();
    expect(await screen.findByText(/5 frames · 10 candidates/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /candidate queue/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /frame scrubber/i })).toBeInTheDocument();
    expectNoBannedCopy();
  });
});

describe('explorer', () => {
  it('opens a candidate drawer and keeps the selection when the drawer closes', async () => {
    const user = userEvent.setup();
    renderApp(`/?f=${TUTORIAL}`);

    const list = await screen.findByRole('list', { name: /ranked candidates/i });
    const first = within(list).getAllByRole('button')[0];
    await user.click(first);

    expect(
      await screen.findByRole('heading', { name: /stack versus originals/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Unconfirmed').length).toBeGreaterThan(1);
    expect(screen.getByText(/not a detection claim/i)).toBeInTheDocument();
    expectNoBannedCopy();

    await user.click(screen.getByRole('button', { name: /close candidate detail/i }));
    expect(
      screen.queryByRole('heading', { name: /stack versus originals/i }),
    ).not.toBeInTheDocument();

    // The URL still holds `sel`, so choosing the same candidate reopens it.
    await user.click(first);
    expect(
      await screen.findByRole('heading', { name: /stack versus originals/i }),
    ).toBeInTheDocument();
  });

  it('gates ranking controls when the server reports no model', async () => {
    renderApp(`/?f=${TUTORIAL}`);

    expect(await screen.findByTestId('queue-subtitle')).toHaveTextContent(
      /ranked by stack snr/i,
    );
    expect(screen.queryByText(/ranked by model score/i)).not.toBeInTheDocument();
  });
});

describe('candidates', () => {
  it('asks for a field before showing the search form', async () => {
    renderApp('/candidates');

    expect(
      await screen.findByRole('heading', { name: /choose a field first/i }),
    ).toBeInTheDocument();
    expectNoBannedCopy();
  });

  it('estimates the search, runs it, and reuses the stored result', async () => {
    const user = userEvent.setup();
    renderApp(`/candidates?f=${TUTORIAL}`);

    expect(
      await screen.findByRole('heading', { name: /run a moving-object search/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/within the work budget/i, {}, { timeout: 3000 })).toBeInTheDocument();

    // Ranking is disabled by capabilities, so its switch must not be rendered.
    expect(screen.queryByLabelText(/rank after search/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/ordered by stack snr/i).length).toBeGreaterThan(0);

    const run = screen.getByRole('button', { name: /^run search$/i });
    expect(run).toBeEnabled();
    await user.click(run);

    expect(
      await screen.findByText(/showing results from an earlier identical run/i),
    ).toBeInTheDocument();
    expectNoBannedCopy();
  });
});

describe('methods', () => {
  it('shows real validation evidence and reruns the stored experiment', async () => {
    const user = userEvent.setup();
    renderApp(`/methods?f=${TUTORIAL}`);

    expect(
      await screen.findByRole('heading', { name: /how the search works/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /^validation$/i })).toBeInTheDocument();

    const rerun = await screen.findByRole('button', {
      name: /run validation with these settings/i,
    });
    await user.click(rerun);

    expect(await screen.findByText(VALIDATION_JOB)).toBeInTheDocument();
    expect(
      await screen.findByText(/showing results from an earlier identical run/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not a calibrated probability/i).length).toBeGreaterThan(0);
    expectNoBannedCopy();
  });
});
