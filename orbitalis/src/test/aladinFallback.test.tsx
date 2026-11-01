import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './render';

// Simulate a browser where Aladin Lite cannot start (offline, no WebGL2, blocked script).
vi.mock('aladin-lite', () => ({
  default: {
    init: { then: (_resolve: unknown, reject: (e: Error) => void) => reject(new Error('WebGL2 is not available')) },
  },
}));

describe('Aladin Lite failure', () => {
  it('falls back to the built-in sky view and says so', async () => {
    renderApp('/', 'auto');
    expect(await screen.findByText(/Aladin Lite could not start \(WebGL2 is not available\)/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(await screen.findByTestId('sky-svg')).toBeInTheDocument();
    // The "Simple" view is now the active one.
    expect(screen.getByRole('button', { name: 'Simple' })).toHaveAttribute('aria-pressed', 'true');
  });
});
