import { useMemo, useState } from 'react';
import type { Lightcurve, LightcurvePoint } from '@/data/types';
import { formatFluxMjy, formatMjdDate, formatWavelength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['#55d6e8', '#f5b942', '#a78bfa', '#38d39f', '#7b9dff', '#ff9d9d'];

function shortFlux(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return value.toExponential(0);
}

function wavelengthGroup(point: LightcurvePoint): string {
  return point.wavelength_um.toFixed(2);
}

interface LightcurveChartProps {
  lightcurve: Lightcurve;
  className?: string;
  compact?: boolean;
}

/**
 * Quick-look flux against time. Detected measurements carry an error bar;
 * non-detections are drawn at their upper limit as a downward limit marker.
 * Points are grouped and coloured by wavelength because the series mixes
 * bandpasses (the API note says so).
 */
export function LightcurveChart({ lightcurve, className, compact = false }: LightcurveChartProps) {
  const [showTable, setShowTable] = useState(false);

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

  const width = compact ? 420 : 640;
  const height = compact ? 170 : 230;
  const pad = { top: 16, right: 14, bottom: 34, left: 52 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((point) => point.mjd);
    const ys = points.flatMap((point) => {
      if (point.detected) {
        const low = point.flux_mjy - Math.abs(point.flux_err_mjy || 0);
        const high = point.flux_mjy + Math.abs(point.flux_err_mjy || 0);
        return [low, high].filter((value) => Number.isFinite(value));
      }
      return Number.isFinite(point.upper_limit_mjy) ? [point.upper_limit_mjy] : [];
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Light curve with ${points.length} measurements across ${wavelengths.length} wavelength group${
          wavelengths.length === 1 ? '' : 's'
        }.`}
      >
        <rect x="0" y="0" width={width} height={height} fill="#0c1220" rx="8" />
        {geometry && (
          <>
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
                .filter((point) => wavelengthGroup(point) === group && point.detected)
                .sort((a, b) => a.mjd - b.mjd);
              if (series.length < 2) return null;
              return (
                <polyline
                  key={`line-${group}`}
                  points={series.map((point) => `${geometry.xScale(point.mjd)},${geometry.yScale(point.flux_mjy)}`).join(' ')}
                  fill="none"
                  stroke={colorFor(series[0])}
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                />
              );
            })}

            {points.map((point) => {
              const x = geometry.xScale(point.mjd);
              const color = colorFor(point);
              if (!point.detected) {
                const y = geometry.yScale(point.upper_limit_mjy);
                return (
                  <g key={point.frame_ref}>
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
                      )}`}
                    </title>
                  </g>
                );
              }
              const y = geometry.yScale(point.flux_mjy);
              const err = Math.abs(point.flux_err_mjy || 0);
              const yHigh = geometry.yScale(point.flux_mjy + err);
              const yLow = geometry.yScale(point.flux_mjy - err);
              return (
                <g key={point.frame_ref}>
                  <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1.1" />
                  <line x1={x - 2.5} x2={x + 2.5} y1={yHigh} y2={yHigh} stroke={color} strokeWidth="1.1" />
                  <line x1={x - 2.5} x2={x + 2.5} y1={yLow} y2={yLow} stroke={color} strokeWidth="1.1" />
                  <circle cx={x} cy={y} r="2.8" fill={color} stroke="#0c1220" strokeWidth="1" />
                  <title>
                    {`${formatMjdDate(point.mjd)} · ${formatWavelength(point.wavelength_um)} · ${formatFluxMjy(
                      point.flux_mjy,
                    )} ± ${formatFluxMjy(err)} · SNR ${point.snr.toFixed(1)}`}
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
          </>
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        {wavelengths.map((group) => (
          <span key={group} className="inline-flex items-center gap-1.5">
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
        <span className="ml-auto">flux in MJy</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 max-w-[48ch] text-[11px] leading-snug text-haze">
          Quick-look photometry; not a calibrated light curve. Frames span bandpasses, so compare
          points of the same colour.
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
                <th scope="col" className="px-2 py-1.5 text-right font-medium">SNR</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.frame_ref} className="border-t border-line/70">
                  <td className="px-2 py-1.5 font-mono">{formatMjdDate(point.mjd)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatWavelength(point.wavelength_um)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {point.detected ? formatFluxMjy(point.flux_mjy) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {point.detected ? formatFluxMjy(point.flux_err_mjy) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatFluxMjy(point.upper_limit_mjy)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{point.snr.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
