import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import uPlot from 'uplot';
import { SpectrumView } from './SpectrumView';
import { LightcurveChart } from './LightcurveChart';
import { WavelengthCoverage } from './WavelengthCoverage';
import type { Lightcurve, LightcurvePoint, Spectrum, SpectrumPoint } from '@/data/types';

vi.mock('uplot', () => {
  class FakeUPlot {
    static instances: FakeUPlot[] = [];
    opts: Record<string, any>;
    data: unknown;
    el: unknown;
    bbox = { top: 0, left: 0, width: 640, height: 260 };
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      rect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
    };
    valToPos = (value: number) => value;
    posToVal = (pos: number) => pos;
    valToPosTime = false;
    redraw = vi.fn();
    destroy = vi.fn();
    constructor(opts: Record<string, any>, data: unknown, el: unknown) {
      this.opts = opts;
      this.data = data;
      this.el = el;
      FakeUPlot.instances.push(this);
    }
    static paths = {
      bars: () => () => null,
      points: () => () => null,
      linear: () => () => null,
    };
  }
  return { default: FakeUPlot };
});

function lastPlot(): any {
  return (uPlot as any).instances.at(-1);
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
});

const method = {
  kind: 'fixed' as const,
  centroid_radius_px: 3,
  aperture_radius_px: 2.5,
  annulus_px: [4, 7] as [number, number],
  min_snr: 3,
  min_aperture_coverage: 0.8,
  upper_limit_sigma: 3,
  note: 'quick-look aperture photometry; not calibrated',
  calibrated: false as const,
};

function sedPoint(overrides: Partial<SpectrumPoint>): SpectrumPoint {
  return {
    wavelength_um: 1,
    flux_mjy: 1e-8,
    flux_err_mjy: 1e-9,
    upper_limit_mjy: 3e-9,
    n_frames: 1,
    n_detected: 1,
    detected: true,
    masked_bits: null,
    ...overrides,
  };
}

const SED: Spectrum = {
  status: 'ok',
  points: [
    sedPoint({ wavelength_um: 0.75 }),
    sedPoint({
      wavelength_um: 1.1,
      flux_mjy: null,
      flux_err_mjy: null,
      upper_limit_mjy: null,
      detected: false,
      n_detected: 0,
      masked_bits: ['BLOOM'],
    }),
    sedPoint({ wavelength_um: 1.6, flux_mjy: 2e-8, detected: true }),
  ],
  method: {
    kind: 'spectrum',
    note: 'quick-look SED; not calibrated; frames span 5 days',
    calibrated: false,
  },
};

function point(overrides: Partial<LightcurvePoint>): LightcurvePoint {
  return {
    frame_ref: 'fr-1',
    mjd: 60840,
    wavelength_um: 0.75,
    detector: 1,
    x: 10,
    y: 12,
    ra: 150,
    dec: -40,
    flux_mjy: 1e-8,
    flux_err_mjy: 1e-9,
    upper_limit_mjy: 3e-9,
    snr: 10,
    detected: true,
    aperture_coverage: 1,
    masked_bits: null,
    ...overrides,
  };
}

const LIGHTCURVE: Lightcurve = {
  kind: 'candidate',
  reference: {
    candidate_id: 'c_test',
    position: { ra: 150, dec: -40 },
    reference_mjd: 60840,
    motion: { mu_e_arcsec_per_day: 0.1, mu_n_arcsec_per_day: 0.2 },
  },
  method,
  points: [
    point({ frame_ref: 'fr-1', mjd: 60840 }),
    point({
      frame_ref: 'fr-2',
      mjd: 60841,
      flux_mjy: null,
      flux_err_mjy: null,
      upper_limit_mjy: null,
      snr: null,
      detected: false,
      aperture_coverage: 0.5,
      masked_bits: ['HALO'],
    }),
    point({ frame_ref: 'fr-3', mjd: 60842, flux_mjy: 2e-8 }),
  ],
};

describe('SpectrumView', () => {
  it('reports masked bins as gaps and labels the SED as quick-look', () => {
    render(<SpectrumView spectrum={SED} />);

    expect(
      screen.getByRole('img', { name: /2 detected bins, 0 upper limits and 1 masked bins/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/masked \(no flux\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not band-averaged medians and not a calibrated spectrum/i),
    ).toBeInTheDocument();

    const plot = lastPlot();
    const series = plot.data as [number[], (number | null)[], (number | null)[]];
    expect(series[0]).toEqual([0.75, 1.1, 1.6]);
    expect(series[1]).toEqual([1e-8, null, 2e-8]);
    expect(series[2]).toEqual([null, null, null]);
  });

  it('shades the selected wavelength range like the band filter', () => {
    render(<SpectrumView spectrum={SED} wavelengthRange={[0.7, 1.2]} />);

    expect(screen.getByText(/range 0\.70–1\.20 µm/i)).toBeInTheDocument();
    const plot = lastPlot();
    const drawClear = plot.opts.hooks.drawClear[0];
    drawClear(plot);
    expect(plot.ctx.fillRect).toHaveBeenCalled();
    expect(plot.ctx.strokeRect).toHaveBeenCalled();
    expect(plot.ctx.setLineDash).toHaveBeenCalled();
  });

  it('shows partial measurements when the SED is insufficient but bins exist', () => {
    render(
      <SpectrumView
        spectrum={{
          status: 'insufficient_data',
          reason: 'no significant detections: 1 wavelength bins detected (need 3)',
          points: [sedPoint({ wavelength_um: 1.1 })],
          method: { kind: 'spectrum', note: 'quick-look SED; not calibrated', calibrated: false },
        }}
      />,
    );

    expect(screen.getByText(/not enough data for a spectral energy distribution/i)).toBeVisible();
    expect(screen.getByText(/1 wavelength bins detected \(need 3\)/i)).toBeVisible();
    expect(
      screen.getByRole('img', { name: /Partial wavelength measurements: 1 detected bins/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Partial wavelength measurements/i)).toBeInTheDocument();
  });

  it('shows the honest reason when the SED has insufficient data', () => {
    render(
      <SpectrumView
        spectrum={{
          status: 'insufficient_data',
          reason: 'fewer than three usable wavelength bins',
          points: null,
          method: null,
        }}
      />,
    );

    expect(screen.getByText(/not enough data for a spectral energy distribution/i)).toBeVisible();
    expect(screen.getByText(/fewer than three usable wavelength bins/i)).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('LightcurveChart', () => {
  it('gaps masked measurements and never draws them at zero', () => {
    render(<LightcurveChart lightcurve={LIGHTCURVE} />);

    expect(
      screen.getByRole('img', { name: /2 usable and 1 masked measurements/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/masked/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Flux is withheld below 80% aperture coverage/i)).toBeVisible();
    expect(screen.queryByText(/^0 MJy$/)).not.toBeInTheDocument();
  });

  it('shows the mask bits in the table', async () => {
    const user = userEvent.setup();
    render(<LightcurveChart lightcurve={LIGHTCURVE} />);
    await user.click(screen.getByRole('button', { name: /view as table/i }));
    await waitFor(() => expect(screen.getAllByText('HALO').length).toBeGreaterThan(0));
  });

  it('dims measurements outside the selected wavelength range', () => {
    const ranged: Lightcurve = {
      ...LIGHTCURVE,
      points: [
        point({ frame_ref: 'fr-in', mjd: 60840, wavelength_um: 0.75 }),
        point({ frame_ref: 'fr-out', mjd: 60841, wavelength_um: 1.6 }),
      ],
    };
    const { container } = render(
      <LightcurveChart lightcurve={ranged} wavelengthRange={[0.7, 0.8]} />,
    );

    expect(screen.getByText(/range 0\.70–0\.80 µm/i)).toBeInTheDocument();
    expect(container.querySelectorAll('g[opacity="0.22"]')).toHaveLength(1);
  });
});

describe('WavelengthCoverage', () => {
  it('is read-only by default and counts only stored wavelengths', () => {
    const { container } = render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.1, detector: 2 },
        ]}
        spectrum={SED}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: /3 stored frames and 3 SED bins: 3 distinct wavelengths/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/read-only · from stored frames/i)).toBeInTheDocument();
    expect(screen.getByText(/2 wavelengths · 3 frames/i)).toBeInTheDocument();
    expect(screen.getByTestId('wavelength-range-label')).toHaveTextContent(
      '0.75–1.60 µm · all 3 frames · all 3 SED bins',
    );
    expect(screen.queryByText(/102 bands/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="frame-bin-bar"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="sed-bin-bar"]')).toHaveLength(3);
    expect(container.querySelector('svg')?.innerHTML).not.toContain('#55d6e8');
  });

  it('labels a selected range with real frame and SED counts', () => {
    const { container } = render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.1, detector: 2 },
          { wavelength_um: 1.6, detector: 1 },
          { wavelength_um: 1.6, detector: 2 },
        ]}
        spectrum={SED}
        selection={[0.75, 1.1]}
      />,
    );

    expect(screen.getByTestId('wavelength-range-label')).toHaveTextContent(
      '0.75–1.10 µm · 3 of 5 frames · 2 of 3 SED bins',
    );
    expect(container.querySelectorAll('rect[fill-opacity="0.16"]')).toHaveLength(2);
    expect(container.querySelector('svg')?.innerHTML).not.toContain('#feb832');
  });

  it('marks the current stored wavelength without adding a colour scale', () => {
    const { container } = render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.6, detector: 1 },
        ]}
        selectedWavelength={1.1}
      />,
    );

    const marker = screen.getByTestId('selected-wavelength-marker');
    expect(marker).toHaveTextContent('1.10 µm');
    expect(marker.querySelector('line')).toHaveAttribute('stroke', '#e8eef8');
    expect(container.querySelector('svg')?.innerHTML).not.toContain('#55d6e8');
  });

  it('selects and clears a wavelength interval from the keyboard', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.6, detector: 1 },
        ]}
        onSelectionChange={onSelectionChange}
      />,
    );

    const plot = screen.getByTestId('wavelength-coverage-plot');
    plot.focus();
    await user.keyboard('{ArrowRight}');
    expect(onSelectionChange).toHaveBeenLastCalledWith([0.75, 0.77]);

    await user.keyboard('{Escape}');
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it('drags a wavelength interval and clears on a plain click', () => {
    const onSelectionChange = vi.fn();
    render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.6, detector: 1 },
        ]}
        onSelectionChange={onSelectionChange}
      />,
    );

    const plot = screen.getByTestId('wavelength-coverage-plot');
    const rect = vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 112,
      right: 640,
      bottom: 112,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    try {
      fireEvent.pointerDown(plot, { clientX: 0, pointerId: 1 });
      fireEvent.pointerMove(plot, { clientX: (0.35 / 0.85) * 640, pointerId: 1 });
      fireEvent.pointerUp(plot, { clientX: (0.35 / 0.85) * 640, pointerId: 1 });
      expect(onSelectionChange).toHaveBeenLastCalledWith([0.75, 1.1]);

      fireEvent.pointerDown(plot, { clientX: 100, pointerId: 1 });
      fireEvent.pointerUp(plot, { clientX: 100, pointerId: 1 });
      expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    } finally {
      rect.mockRestore();
    }
  });
});
