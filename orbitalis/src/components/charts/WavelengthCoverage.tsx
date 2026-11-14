import type { Frame, Spectrum } from '@/data/types';
import { formatWavelength } from '@/lib/format';

interface WavelengthCoverageProps {
  frames: Array<Pick<Frame, 'wavelength_um' | 'detector'>>;
  spectrum?: Spectrum | null;
  selectedWavelength?: number | null;
  className?: string;
}

interface Bin {
  wavelength: number;
  count: number;
  detectors: number[];
}

/**
 * Read-only wavelength coverage. Every mark comes from stored frame metadata
 * (or SED points when supplied); there is no selectable band filter and no
 * implied calibration.
 */
export function WavelengthCoverage({
  frames,
  spectrum,
  selectedWavelength = null,
  className,
}: WavelengthCoverageProps) {
  const bins = new Map<string, Bin>();
  for (const frame of frames) {
    if (!Number.isFinite(frame.wavelength_um)) continue;
    const key = frame.wavelength_um.toFixed(2);
    const bin = bins.get(key);
    if (bin) {
      bin.count += 1;
      if (!bin.detectors.includes(frame.detector)) bin.detectors.push(frame.detector);
    } else {
      bins.set(key, {
        wavelength: frame.wavelength_um,
        count: 1,
        detectors: [frame.detector],
      });
    }
  }

  const ordered = [...bins.values()].sort((a, b) => a.wavelength - b.wavelength);
  if (ordered.length === 0) {
    return (
      <p className={className ?? 'm-0 text-[11px] text-haze'}>
        Wavelength coverage appears once frames are stored.
      </p>
    );
  }

  const min = ordered[0].wavelength;
  const max = ordered[ordered.length - 1].wavelength;
  const span = Math.max(max - min, 1e-6);
  const maxCount = Math.max(...ordered.map((bin) => bin.count));

  const width = 640;
  const height = 112;
  const pad = { top: 18, right: 12, bottom: 22, left: 12 };
  const plotWidth = width - pad.left - pad.right;
  const histogramHeight = 44;
  const spectrumY = pad.top + histogramHeight + 18;

  const xScale = (value: number) => pad.left + ((value - min) / span) * plotWidth;

  const spectrumPoints = (spectrum?.points ?? []).filter(
    (point) => Number.isFinite(point.wavelength_um),
  );

  const selected =
    selectedWavelength !== null && Number.isFinite(selectedWavelength)
      ? selectedWavelength
      : null;

  const detectors = [...new Set(frames.map((frame) => frame.detector))].sort((a, b) => a - b);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Wavelength coverage from ${frames.length} stored frames: ${ordered.length} distinct bands between ${formatWavelength(
          min,
        )} and ${formatWavelength(max)}.`}
      >
        <rect x="0" y="0" width={width} height={height} fill="#0c1220" rx="8" />

        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + histogramHeight}
          y2={pad.top + histogramHeight}
          stroke="#3b4a69"
          strokeWidth="1"
        />

        {ordered.map((bin) => {
          const x = xScale(bin.wavelength);
          const barWidth = Math.max(1.5, Math.min(12, plotWidth / ordered.length - 1));
          const barHeight = (bin.count / maxCount) * histogramHeight;
          return (
            <g key={bin.wavelength}>
              <rect
                x={x - barWidth / 2}
                y={pad.top + histogramHeight - barHeight}
                width={barWidth}
                height={barHeight}
                rx="1"
                fill="#55d6e8"
                fillOpacity="0.55"
              />
              <title>
                {`${formatWavelength(bin.wavelength)} · ${bin.count} frame${
                  bin.count === 1 ? '' : 's'
                } · detector ${bin.detectors.map((id) => `D${id}`).join(', ')}`}
              </title>
            </g>
          );
        })}

        {selected !== null && selected >= min && selected <= max && (
          <g>
            <line
              x1={xScale(selected)}
              x2={xScale(selected)}
              y1={pad.top - 4}
              y2={pad.top + histogramHeight + 6}
              stroke="#feb832"
              strokeWidth="1.2"
            />
            <text
              x={xScale(selected)}
              y={pad.top - 7}
              textAnchor="middle"
              fill="#feb832"
              fontSize="9"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {formatWavelength(selected)}
            </text>
          </g>
        )}

        <text
          x={pad.left}
          y={pad.top + histogramHeight + 17}
          fill="#7f8ba5"
          fontSize="9"
          fontFamily="'IBM Plex Mono', monospace"
        >
          SED bins
        </text>

        {spectrumPoints.length === 0 && (
          <text
            x={width - pad.right}
            y={spectrumY + 3}
            textAnchor="end"
            fill="#5b6884"
            fontSize="9"
            fontFamily="'IBM Plex Mono', monospace"
          >
            no SED loaded
          </text>
        )}

        {spectrumPoints.map((point) => {
          const x = xScale(point.wavelength_um);
          const label = `${formatWavelength(point.wavelength_um)} · ${
            point.flux_mjy === null
              ? 'masked'
              : point.detected
                ? 'detected'
                : 'upper limit'
          }`;
          return (
            <g key={`${point.wavelength_um}-${point.n_frames}`}>
              {point.flux_mjy === null ? (
                <text
                  x={x}
                  y={spectrumY + 3}
                  textAnchor="middle"
                  fill="#5b6884"
                  fontSize="9"
                >
                  ×
                </text>
              ) : point.detected ? (
                <circle cx={x} cy={spectrumY} r="2.4" fill="#55d6e8" />
              ) : (
                <path
                  d={`M${x - 3},${spectrumY - 3} L${x + 3},${spectrumY - 3} L${x},${spectrumY + 3} Z`}
                  fill="none"
                  stroke="#f5b942"
                  strokeWidth="1"
                />
              )}
              <title>{label}</title>
            </g>
          );
        })}

        <text
          x={pad.left}
          y={height - 6}
          fill="#7f8ba5"
          fontSize="9"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {formatWavelength(min)}
        </text>
        <text
          x={width - pad.right}
          y={height - 6}
          textAnchor="end"
          fill="#7f8ba5"
          fontSize="9"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {formatWavelength(max)}
        </text>
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        <span>
          {ordered.length} band{ordered.length === 1 ? '' : 's'} · {frames.length} frame
          {frames.length === 1 ? '' : 's'}
        </span>
        {detectors.length > 0 && (
          <span>detector{detectors.length === 1 ? '' : 's'} {detectors.map((id) => `D${id}`).join(', ')}</span>
        )}
        <span className="ml-auto">read-only · from stored frames</span>
      </div>
    </div>
  );
}
