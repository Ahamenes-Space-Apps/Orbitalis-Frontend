import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpectrumView } from './SpectrumView';
import { LightcurveChart } from './LightcurveChart';
import { WavelengthCoverage } from './WavelengthCoverage';
import type { Lightcurve, LightcurvePoint, Spectrum, SpectrumPoint } from '@/data/types';

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
});

describe('WavelengthCoverage', () => {
  it('is read-only and counts only stored frame wavelengths', () => {
    render(
      <WavelengthCoverage
        frames={[
          { wavelength_um: 0.75, detector: 1 },
          { wavelength_um: 1.1, detector: 1 },
          { wavelength_um: 1.1, detector: 2 },
        ]}
        spectrum={SED}
      />,
    );

    expect(screen.getByRole('img', { name: /3 stored frames: 2 distinct bands/i })).toBeInTheDocument();
    expect(screen.getByText(/read-only · from stored frames/i)).toBeInTheDocument();
    expect(screen.getByText(/2 bands · 3 frames/i)).toBeInTheDocument();
    expect(screen.queryByText(/102 bands/i)).not.toBeInTheDocument();
  });
});
