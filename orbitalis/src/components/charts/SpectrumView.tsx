import type { Spectrum } from '@/data/types';
import { formatFluxMjy, formatWavelength } from '@/lib/format';

/**
 * Spectrum card. The current API returns `insufficient_data` for these
 * fields, so the normal state is a plain reason rather than an empty chart.
 * Spectral-type estimates are only shown when classification is enabled;
 * that gate lives in the caller.
 */
export function SpectrumView({ spectrum }: { spectrum: Spectrum | undefined }) {
  if (!spectrum) {
    return <p className="m-0 text-[12px] text-haze">The spectrum has not loaded.</p>;
  }

  const points = spectrum.points ?? [];
  if (spectrum.status !== 'ok' || points.length === 0) {
    const reason =
      'reason' in spectrum && typeof spectrum.reason === 'string'
        ? spectrum.reason
        : 'The archive did not return usable spectrum points.';
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bar px-3 py-3">
        <p className="m-0 text-[13px] font-medium text-mist">Not enough data for a spectral type</p>
        <p className="m-0 text-[12px] leading-snug text-haze">{reason}</p>
      </div>
    );
  }

  const width = 480;
  const height = 150;
  const pad = { top: 12, right: 12, bottom: 28, left: 48 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xs = points.map((point) => point.wavelength_um);
  const ys = points.map((point) => point.flux);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xScale = (value: number) =>
    pad.left + ((value - xMin) / Math.max(xMax - xMin, 1e-9)) * plotWidth;
  const yScale = (value: number) =>
    pad.top + plotHeight - ((value - yMin) / Math.max(yMax - yMin, 1e-9)) * plotHeight;

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Spectrum with ${points.length} measurements.`}
      >
        <rect width={width} height={height} fill="#0c1220" rx="8" />
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="#3b4a69"
        />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="#3b4a69" />
        <polyline
          points={points.map((point) => `${xScale(point.wavelength_um)},${yScale(point.flux)}`).join(' ')}
          fill="none"
          stroke="#55d6e8"
          strokeWidth="1.5"
        />
        {points.map((point) => (
          <circle
            key={`${point.wavelength_um}-${point.frame_ref ?? ''}`}
            cx={xScale(point.wavelength_um)}
            cy={yScale(point.flux)}
            r="2.4"
            fill="#55d6e8"
          >
            <title>
              {`${formatWavelength(point.wavelength_um)} · ${formatFluxMjy(point.flux)}`}
            </title>
          </circle>
        ))}
        <text x={pad.left} y={height - 8} fill="#7f8ba5" fontSize="9.5" fontFamily="'IBM Plex Mono', monospace">
          {formatWavelength(xMin)}
        </text>
        <text
          x={width - pad.right}
          y={height - 8}
          textAnchor="end"
          fill="#7f8ba5"
          fontSize="9.5"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {formatWavelength(xMax)}
        </text>
      </svg>
      <p className="m-0 text-[11px] leading-snug text-haze">
        Measurements only. Spectral types need enough wavelength coverage.
      </p>
    </div>
  );
}
