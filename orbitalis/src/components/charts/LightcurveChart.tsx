import { useMemo, useState } from 'react';
import type { Lightcurve, LightcurvePoint } from '@/data/types';
import {
  formatFluxMjy,
  formatMjdDate,
  formatPercent,
  formatSnr,
  formatWavelength,
  formatWavelengthRange,
} from '@/lib/format';
import { inWavelengthRange, normalizeWavelengthRange, type WavelengthRange } from '@/lib/wavelength';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['#55d6e8', '#f5b942', '#a78bfa', '#38d39f', '#7b9dff', '#ff9d9d'];
const MASKED_COLOR = '#5b6884';

function shortFlux(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return value.toExponential(0);
}

function wavelengthGroup(point: LightcurvePoint): string {
  return point.wavelength_um.toFixed(2);
}

function isMasked(point: LightcurvePoint): boolean {
  return point.flux_mjy === null || !Number.isFinite(point.flux_mjy);
}

function maskedLabel(point: LightcurvePoint): string {
  if (point.masked_bits && point.masked_bits.length > 0) {
    return `masked by ${point.masked_bits.join(', ')}`;
  }
  return 'masked: aperture coverage below the detection threshold';
}

interface LightcurveChartProps {
  lightcurve: Lightcurve;
  className?: string;
  compact?: boolean;
  wavelengthRange?: WavelengthRange | null;
}

/**
 * Quick-look flux against time. Detected measurements carry an error bar;
 * non-detections are drawn at their upper limit as a downward limit marker.
 * Bins with null flux (masked or low aperture coverage) are gaps: they are
 * never drawn as zero and no line crosses them.
 */
export function LightcurveChart({
  lightcurve,
  className,
  compact = false,
  wavelengthRange: wavelengthRangeProp = null,
}: LightcurveChartProps) {
  const [showTable, setShowTable] = useState(false);
  const wavelengthRange = normalizeWavelengthRange(wavelengthRangeProp);

  const points = useMemo(
    () => [...lightcurve.points].sort((a, b) => a.mjd - b.mjd),
    [lightcurve.points],
  );

  const wavelengths = useMemo(
    () => [...new Set(points.map(wavelengthGroup))].sort((a, b) => Number(a) - Number(b)),
    [points],
  );
  const colorFor = (point: LightcurvePoint) =>
    COLORS[Math.max(0, wavelengths.indexOf(wavelengthGroup(point))) % COLORS.length];
  const inSelectedRange = (point: LightcurvePoint) =>
    !wavelengthRange || inWavelengthRange(point.wavelength_um, wavelengthRange);
  const wavelengthGroupInRange = (group: string) =>
    !wavelengthRange || inWavelengthRange(Number(group), wavelengthRange);

  const width = compact ? 420 : 640;
  const height = compact ? 170 : 230;
  const pad = { top: 16, right: 14, bottom: 34, left: 52 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((point) => point.mjd);
    const ys = points.flatMap((point) => {
      if (!isMasked(point) && point.detected && point.flux_mjy !== null) {
        const err = Math.abs(point.flux_err_mjy ?? 0);
        return [point.flux_mjy - err, point.flux_mjy + err].filter((value) =>
          Number.isFinite(value),
        );
      }
      if (!point.detected && point.upper_limit_mjy !== null) {
        return Number.isFinite(point.upper_limit_mjy) ? [point.upper_limit_mjy] : [];
      }
      return [];
    });
    if (ys.length === 0) return null;

    let xMin = Math.min(...xs);
    let xMax = Math.max(...xs);
    if (xMax === xMin) {
      xMin -= 0.5;
      xMax += 0.5;
    }
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax === yMin) {
      const span = Math.max(Math.abs(yMax) * 0.2, 1e-12);
      yMin -= span;
      yMax += span;
    }
    const yPad = (yMax - yMin) * 0.08;
    yMin -= yPad;
    yMax += yPad;

    const xScale = (mjd: number) => pad.left + ((mjd - xMin) / (xMax - xMin)) * plotWidth;
    const yScale = (flux: number) => pad.top + plotHeight - ((flux - yMin) / (yMax - yMin)) * plotHeight;
    return { xMin, xMax, yMin, yMax, xScale, yScale };
  }, [pad.left, pad.top, plotHeight, plotWidth, points]);

  if (points.length === 0) {
    return (
      <p className="m-0 rounded-lg border border-line bg-bar px-3 py-4 text-[12px] leading-snug text-haze">
        No measurements were stored for this light curve.
      </p>
    );
  }

  const xTickFractions = compact ? [0, 1 / 3, 2 / 3, 1] : [0, 0.25, 0.5, 0.75, 1];
  const xTicks = geometry
    ? xTickFractions.map((fraction) => geometry.xMin + fraction * (geometry.xMax - geometry.xMin))
    : [];
  const yTicks = geometry
    ? [0, 0.25, 0.5, 0.75, 1].map((fraction) => geometry.yMin + fraction * (geometry.yMax - geometry.yMin))
    : [];

  const maskedCount = points.filter(isMasked).length;
  const measuredCount = points.length - maskedCount;

  if (!geometry) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bar px-3 py-3">
        <p className="m-0 text-[13px] font-medium text-mist">Every frame is masked</p>
        <p className="m-0 text-[12px] leading-snug text-haze">
          None of the {points.length} frame measurements has usable flux or an upper limit.
        </p>
        {lightcurve.method.note && (
          <p className="m-0 text-[11px] leading-snug text-haze">{lightcurve.method.note}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Light curve with ${measuredCount} usable and ${maskedCount} masked measurements across ${wavelengths.length} wavelength group${
          wavelengths.length === 1 ? '' : 's'
        }.`}
      >
        <rect x="0" y="0" width={width} height={height} fill="#0c1220" rx="8" />
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={geometry.yScale(tick)}
              y2={geometry.yScale(tick)}
              stroke="#1b2438"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={geometry.yScale(tick) + 3.5}
              textAnchor="end"
              fill="#7f8ba5"
              fontSize="9.5"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {shortFlux(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick, index) => (
          <g key={`x-${tick}`}>
            <line
              x1={geometry.xScale(tick)}
              x2={geometry.xScale(tick)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#1b2438"
              strokeWidth="1"
            />
            <text
              x={geometry.xScale(tick)}
              y={height - pad.bottom + 14}
              textAnchor={
                index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'
              }
              fill="#7f8ba5"
              fontSize="9.5"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {formatMjdDate(tick)}
            </text>
          </g>
        ))}

        {wavelengths.map((group) => {
          const series = points
            .filter((point) => wavelengthGroup(point) === group)
            .sort((a, b) => a.mjd - b.mjd);

          const segments: LightcurvePoint[][] = [];
          let current: LightcurvePoint[] = [];
          for (const point of series) {
            if (isMasked(point) || !point.detected || point.flux_mjy === null) {
              if (current.length > 1) segments.push(current);
              current = [];
              continue;
            }
            current.push(point);
          }
          if (current.length > 1) segments.push(current);

          return segments.map((segment, index) => (
            <polyline
              key={`line-${group}-${index}`}
              points={segment
                .map((point) => `${geometry.xScale(point.mjd)},${geometry.yScale(point.flux_mjy as number)}`)
                .join(' ')}
              fill="none"
              stroke={colorFor(segment[0])}
              strokeOpacity={inSelectedRange(segment[0]) ? 0.45 : 0.1}
              strokeWidth="1.2"
            />
          ));
        })}

        {points.map((point) => {
          const x = geometry.xScale(point.mjd);
          const color = colorFor(point);
          const dimmed = !inSelectedRange(point);
          if (isMasked(point)) {
            return (
              <g key={point.frame_ref} opacity={dimmed ? 0.22 : 1}>
                <line
                  x1={x}
                  x2={x}
                  y1={pad.top}
                  y2={height - pad.bottom}
                  stroke={MASKED_COLOR}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  strokeOpacity="0.55"
                />
                <text
                  x={x}
                  y={pad.top - 4}
                  textAnchor="middle"
                  fill={MASKED_COLOR}
                  fontSize="9"
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  ×
                </text>
                <title>
                  {`${formatMjdDate(point.mjd)} · ${formatWavelength(
                    point.wavelength_um,
                  )} · ${maskedLabel(point)} · coverage ${formatPercent(point.aperture_coverage, 0)}`}
                </title>
              </g>
            );
          }

          if (!point.detected) {
            if (point.upper_limit_mjy === null) {
              return (
                <g key={point.frame_ref} opacity={dimmed ? 0.22 : 1}>
                  <line
                    x1={x}
                    x2={x}
                    y1={pad.top}
                    y2={height - pad.bottom}
                    stroke={MASKED_COLOR}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    strokeOpacity="0.55"
                  />
                  <text
                    x={x}
                    y={pad.top - 4}
                    textAnchor="middle"
                    fill={MASKED_COLOR}
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                  >
                    ×
                  </text>
                  <title>
                    {`${formatMjdDate(point.mjd)} · ${formatWavelength(
                      point.wavelength_um,
                    )} · no upper limit stored · coverage ${formatPercent(
                      point.aperture_coverage,
                      0,
                    )}`}
                  </title>
                </g>
              );
            }
            const y = geometry.yScale(point.upper_limit_mjy);
            return (
              <g key={point.frame_ref} opacity={dimmed ? 0.22 : 1}>
                <path
                  d={`M${x - 3.5},${y + 4} L${x},${y - 3} L${x + 3.5},${y + 4} Z`}
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.75"
                  strokeWidth="1.1"
                />
                <title>
                  {`${formatMjdDate(point.mjd)} · ${formatWavelength(point.wavelength_um)} · upper limit ${formatFluxMjy(
                    point.upper_limit_mjy,
                  )} · coverage ${formatPercent(point.aperture_coverage, 0)}`}
                </title>
              </g>
            );
          }

          const flux = point.flux_mjy;
          if (flux === null) return null;
          const y = geometry.yScale(flux);
          const err = Math.abs(point.flux_err_mjy ?? 0);
          const yHigh = geometry.yScale(flux + err);
          const yLow = geometry.yScale(flux - err);
          return (
            <g key={point.frame_ref} opacity={dimmed ? 0.22 : 1}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1.1" />
              <line x1={x - 2.5} x2={x + 2.5} y1={yHigh} y2={yHigh} stroke={color} strokeWidth="1.1" />
              <line x1={x - 2.5} x2={x + 2.5} y1={yLow} y2={yLow} stroke={color} strokeWidth="1.1" />
              <circle cx={x} cy={y} r="2.8" fill={color} stroke="#0c1220" strokeWidth="1" />
              <title>
                {`${formatMjdDate(point.mjd)} · ${formatWavelength(point.wavelength_um)} · ${formatFluxMjy(
                  flux,
                )} ± ${formatFluxMjy(err)} · SNR ${formatSnr(point.snr)}`}
              </title>
            </g>
          );
        })}

        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="#3b4a69"
          strokeWidth="1"
        />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="#3b4a69" strokeWidth="1" />
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        {wavelengthRange && (
          <span className="inline-flex items-center gap-1.5 text-amber-soft">
            range {formatWavelengthRange(wavelengthRange)}
          </span>
        )}
        {wavelengths.map((group) => (
          <span
            key={group}
            className="inline-flex items-center gap-1.5"
            style={{ opacity: wavelengthGroupInRange(group) ? 1 : 0.45 }}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: COLORS[wavelengths.indexOf(group) % COLORS.length] }}
            />
            {formatWavelength(Number(group))}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="text-[11px]">▽</span> upper limit
        </span>
        {maskedCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ color: MASKED_COLOR }}>
              ×
            </span>
            masked
          </span>
        )}
        <span className="ml-auto">flux in MJy</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 max-w-[48ch] text-[11px] leading-snug text-haze">
          Quick-look photometry; not a calibrated light curve. Frames span bandpasses, so compare
          points of the same colour. Flux is withheld below 80% aperture coverage.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((value) => !value)}>
          {showTable ? 'Hide table' : 'View as table'}
        </Button>
      </div>

      {showTable && (
        <div className="max-h-56 overflow-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-[11px]">
            <caption className="sr-only">Light-curve measurements</caption>
            <thead className="sticky top-0 bg-bar text-haze">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-medium">Date</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Wavelength</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Flux</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Error</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Upper limit</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Coverage</th>
                <th scope="col" className="px-2 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  key={point.frame_ref}
                  className={cn(
                    'border-t border-line/70',
                    !inSelectedRange(point) && 'opacity-45',
                  )}
                >
                  <td className="px-2 py-1.5 font-mono">{formatMjdDate(point.mjd)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatWavelength(point.wavelength_um)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {point.detected ? formatFluxMjy(point.flux_mjy) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {point.detected ? formatFluxMjy(point.flux_err_mjy) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {formatFluxMjy(point.upper_limit_mjy)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {formatPercent(point.aperture_coverage, 0)}
                  </td>
                  <td className="px-2 py-1.5 text-[10px] text-haze">
                    {isMasked(point)
                      ? point.masked_bits?.join(', ') || 'masked'
                      : point.detected
                        ? `SNR ${formatSnr(point.snr)}`
                        : 'upper limit'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
