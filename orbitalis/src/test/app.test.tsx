import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUi } from '@/store/useUi';
import { renderApp } from './render';

// uPlot needs a real canvas and Observable Plot measures the DOM. Both are checked in a browser, not in jsdom.
vi.mock('@/components/charts/SpectrumChart', () => ({
  SpectrumChart: (p: { flagged: [number, number] | null }) => (
    <div data-testid="spectrum-chart">{p.flagged ? `flagged ${p.flagged[0]}-${p.flagged[1]}` : 'none'}</div>
  ),
}));
vi.mock('@/components/charts/MotionPlot', () => ({
  MotionPlot: (p: { offsets: unknown[] }) => <div data-testid="motion-plot">{p.offsets.length} points</div>,
}));

describe('Explorer', () => {
  it('shows the ranked queue with #042 first and the sky', async () => {
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Ranked candidates' });
    const rows = await within(list).findAllByRole('button');
    expect(rows[0]).toHaveTextContent('#042');
    expect(rows[0]).toHaveTextContent('0.92');
    expect(await screen.findByTestId('sky-svg')).toBeInTheDocument();
    expect(screen.getByTestId('field-badge')).toHaveTextContent('Synthetic validation field');
    expect(screen.getByTestId('field-badge')).toHaveTextContent('mock API');
  });

  it('moves the time slider and updates the epoch label', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByTestId('sky-svg');
    expect(screen.getByTestId('epoch-label')).toHaveTextContent('Epoch 2 of 3 · T + 6 mo');

    await user.click(screen.getByRole('button', { name: 'Show Epoch 3' }));
    expect(screen.getByTestId('epoch-label')).toHaveTextContent('Epoch 3 of 3 · T + 12 mo');
    expect(screen.getByRole('button', { name: 'Show Epoch 3' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Step to next epoch' }));
    expect(screen.getByTestId('epoch-label')).toHaveTextContent('Epoch 1 of 3');
  });

  it('selects a candidate from the list and from the sky', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const summary = await screen.findByTestId('selected-summary');
    expect(summary).toHaveTextContent('Candidate #042');

    const list = screen.getByRole('list', { name: 'Ranked candidates' });
    await user.click(within(list).getByRole('button', { name: /#017/ }));
    expect(screen.getByTestId('selected-summary')).toHaveTextContent('Candidate #017');
    expect(screen.getByTestId('selected-summary')).toHaveTextContent('9.4″');

    await user.click(screen.getByRole('button', { name: /Candidate 108, moving/ }));
    expect(screen.getByTestId('selected-summary')).toHaveTextContent('Candidate #108');
  });

  it('filters the queue by class and hides known objects', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Ranked candidates' });
    await user.click(screen.getByRole('tab', { name: /Variable/ }));
    await waitFor(() => {
      expect(within(list).getAllByRole('button').every((b) => /Variable/.test(b.textContent ?? ''))).toBe(true);
    });
    await user.click(screen.getByRole('tab', { name: /Moving/ }));
    await user.click(screen.getAllByRole('switch', { name: 'Hide known objects' })[0]);
    await waitFor(() => {
      expect(within(list).queryByText('Known object')).not.toBeInTheDocument();
    });
  });

  it('toggles layers and trails', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByTestId('sky-svg');
    const movingChip = screen.getByRole('button', { name: /Moving 11/ });
    expect(movingChip).toHaveAttribute('aria-pressed', 'true');
    await user.click(movingChip);
    expect(movingChip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /Candidate 042/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trails' }));
    expect(useUi.getState().trails).toBe(false);
  });

  it('keeps the band selection in the store', async () => {
    renderApp('/');
    await screen.findByTestId('sky-svg');
    expect(screen.getByTestId('band-label')).toHaveTextContent('all 102');
    useUi.getState().setBandRange([62, 74]);
    await waitFor(() => expect(screen.getByTestId('band-label')).toHaveTextContent('bands 62–74 of 102'));
  });

  it('switches the coordinate readout to Galactic', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByTestId('coord-readout');
    expect(screen.getByTestId('coord-readout')).toHaveTextContent('RA 10h 52m 04.2s');
    await user.click(screen.getByRole('button', { name: 'Galactic' }));
    expect(screen.getByTestId('coord-readout')).toHaveTextContent(/l \d+\.\d{3}° · b [+−]\d+\.\d{3}°/);
  });
});

describe('Dossier', () => {
  it('shows candidate #042 with the honesty banner, numbers and charts', async () => {
    renderApp('/candidates/42');
    expect(await screen.findByRole('heading', { name: 'Candidate #042' })).toBeInTheDocument();
    expect(screen.getByText(/warrants investigation/)).toBeInTheDocument();
    expect(screen.getByText(/not a confirmed/)).toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('0.92');
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByTestId('spectrum-chart')).toHaveTextContent('flagged 62-74');
    expect(screen.getByTestId('motion-plot')).toHaveTextContent('3 points');
    expect(screen.getByText('Known-object cross-match')).toBeInTheDocument();
    expect(await screen.findByText(/Possible explanations include/)).toBeInTheDocument();
    expect(screen.getByText(/cannot add measurements/)).toBeInTheDocument();
  });

  it('selects the candidate in the explorer store', async () => {
    renderApp('/candidates/17');
    await screen.findByRole('heading', { name: 'Candidate #017' });
    expect(useUi.getState().selectedId).toBe(17);
  });

  it('shows a clear message for an unknown candidate', async () => {
    renderApp('/candidates/9999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in this field/);
  });

  it('shows a clear message for a malformed id', async () => {
    renderApp('/candidates/abc');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in this field/);
  });

  it('explains a known object and notes the score penalty', async () => {
    renderApp('/candidates/231');
    await screen.findByRole('heading', { name: 'Candidate #231' });
    expect(await screen.findByText(/most likely a known solar-system object/)).toBeInTheDocument();
    expect(screen.getByText(/Multiplied by 0.7/)).toBeInTheDocument();
  });
});

describe('Candidates page', () => {
  it('lists all 31 candidates and re-ranks when the weights change', async () => {
    renderApp('/candidates');
    await waitFor(() => expect(screen.getAllByTestId('candidate-row')).toHaveLength(31));
    expect(screen.getAllByTestId('candidate-row')[0]).toHaveTextContent('#042');

    // Put all the weight on motion: the planted object (small shift) no longer wins.
    useUi.getState().setWeights({ M: 1, B: 0, S: 0, T: 0 });
    await waitFor(() => expect(screen.getAllByTestId('candidate-row')[0]).not.toHaveTextContent('#042'));
    expect(screen.getByTestId('weight-M')).toHaveTextContent('100%');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.getAllByTestId('candidate-row')[0]).toHaveTextContent('#042'));
  });

  it('filters by class', async () => {
    const user = userEvent.setup();
    renderApp('/candidates');
    await waitFor(() => expect(screen.getAllByTestId('candidate-row')).toHaveLength(31));
    await user.click(screen.getByRole('tab', { name: /Variable/ }));
    await waitFor(() => expect(screen.getAllByTestId('candidate-row')).toHaveLength(20));
  });
});

describe('Methods page', () => {
  it('states the limits and shows live synthetic validation', async () => {
    renderApp('/methods');
    expect(await screen.findByText(/A candidate is not a detection/)).toBeInTheDocument();
    expect(screen.getByText(/Pixels are large/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('planted-rank')).toHaveTextContent('#042 ranks 1 of 31'));
    expect(screen.getByTestId('movers-in-top')).toHaveTextContent(/\d+ of 11/);
    expect(screen.getByText('GET /api/candidates/{id}')).toBeInTheDocument();
  });
});

describe('Routing', () => {
  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nowhere');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in this field/);
  });
});
