import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './render';

describe('Assistant', () => {
  it('opens from the launcher, shows context and streams an answer', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByTestId('sky-svg');

    await user.click(
      screen.getByRole('button', { name: /Ask the assistant/ }),
    );

    const panel = await screen.findByRole('complementary', {
      name: 'Assistant',
    });

    expect(within(panel).getByText('Candidate #042')).toBeInTheDocument();
    expect(within(panel).getByText('Epoch 2 of 3')).toBeInTheDocument();

    await user.click(
      within(panel).getByRole('button', { name: /Why is #042 ranked first\?/ }),
    );

    expect(
      await within(panel).findByText(/It ranks candidates for inspection/),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/looked up candidate #042/),
    ).toBeInTheDocument();
  });

  it('clears the transcript and returns to the starter prompts', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByTestId('sky-svg');

    await user.click(
      screen.getByRole('button', { name: /Ask the assistant/ }),
    );
    const panel = await screen.findByRole('complementary', {
      name: 'Assistant',
    });

    await user.click(
      within(panel).getByRole('button', { name: /How was this validated\?/ }),
    );
    expect(
      await within(panel).findByText(/Validation injects synthetic sources/),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Clear' }));

    expect(
      within(panel).getByRole('button', { name: /How was this validated\?/ }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByText(/Validation injects synthetic sources/),
    ).not.toBeInTheDocument();
  });
});
