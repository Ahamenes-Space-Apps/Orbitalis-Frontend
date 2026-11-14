import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WavelengthStrip } from './WavelengthStrip';
import type { WavelengthRange } from '@/lib/wavelength';

const FRAMES = [
  { wavelength_um: 0.75, detector: 1 },
  { wavelength_um: 1.1, detector: 1 },
  { wavelength_um: 1.6, detector: 1 },
  { wavelength_um: 1.6, detector: 2 },
];

describe('WavelengthStrip', () => {
  it('renders one rainbow tick per real stored wavelength', () => {
    const { container } = render(<WavelengthStrip frames={FRAMES} />);

    const strip = screen.getByTestId('wavelength-strip');
    expect(strip.children).toHaveLength(3);
    expect(strip.children[0]).toHaveStyle({ opacity: '1' });
    expect(strip.children[0]).toHaveAttribute('title', expect.stringContaining('0.75 µm'));
    const backgrounds = [...strip.children].map((tick) => (tick as HTMLElement).style.background);
    expect(backgrounds.every((background) => background.startsWith('rgb('))).toBe(true);
    expect(new Set(backgrounds).size).toBe(3);

    expect(screen.getByTestId('wavelength-strip-label')).toHaveTextContent(
      'all 3 wavelengths · 0.75–1.60 µm · 4 frames',
    );
    expect(screen.queryByText(/102 bands/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/band \d/i)).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('dims ticks outside the selected wavelength range', () => {
    render(<WavelengthStrip frames={FRAMES} selection={[0.75, 1.1]} onSelectionChange={vi.fn()} />);

    expect(screen.getByTestId('wavelength-strip-label')).toHaveTextContent(
      '0.75–1.10 µm · 2 of 3 wavelengths · 2 of 4 frames',
    );
    const strip = screen.getByTestId('wavelength-strip');
    expect(strip.children[0]).toHaveStyle({ opacity: '1' });
    expect(strip.children[1]).toHaveStyle({ opacity: '1' });
    expect(strip.children[2]).toHaveStyle({ opacity: '0.22' });
    expect(screen.getByRole('button', { name: /all wavelengths/i })).toBeInTheDocument();
  });

  it('drags a real wavelength interval and clears on a plain click', () => {
    const onSelectionChange = vi.fn();
    render(<WavelengthStrip frames={FRAMES} onSelectionChange={onSelectionChange} />);

    const strip = screen.getByTestId('wavelength-strip');
    const rect = vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 26,
      right: 300,
      bottom: 26,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    try {
      fireEvent.pointerDown(strip, { clientX: 10, pointerId: 1 });
      fireEvent.pointerMove(strip, { clientX: 140, pointerId: 1 });
      fireEvent.pointerUp(strip, { clientX: 140, pointerId: 1 });
      expect(onSelectionChange).toHaveBeenLastCalledWith([0.75, 1.1]);

      fireEvent.pointerDown(strip, { clientX: 100, pointerId: 1 });
      fireEvent.pointerUp(strip, { clientX: 100, pointerId: 1 });
      expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    } finally {
      rect.mockRestore();
    }
  });

  it('selects and clears a wavelength interval from the keyboard', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [range, setRange] = useState<WavelengthRange | null>(null);
      return (
        <WavelengthStrip frames={FRAMES} selection={range} onSelectionChange={setRange} />
      );
    }
    render(<Harness />);

    const strip = screen.getByTestId('wavelength-strip');
    const label = screen.getByTestId('wavelength-strip-label');
    strip.focus();
    await user.keyboard('{ArrowRight}');
    expect(label).toHaveTextContent('0.75–0.75 µm');

    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(label).toHaveTextContent('0.75–1.10 µm');

    await user.keyboard('{Escape}');
    expect(label).toHaveTextContent('all 3 wavelengths');
  });
});
