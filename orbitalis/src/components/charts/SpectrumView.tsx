import type { Spectrum, SpectrumPoint } from '@/data/types';
import { formatFluxMjy, formatWavelength, formatWavelengthRange } from '@/lib/format';
import { inWavelengthRange, normalizeWavelengthRange, type WavelengthRange } from '@/lib/wavelength';

const DETECTED = '#55d6e8';
const LIMIT = '#f5b942';
const MASKED = '#5b6884';

function maskedLabel(point: SpectrumPoint): string {
  if (point.masked_bits && point.masked_bits.length > 0) {
    return `masked (${point.masked_bits.join(', ')})`;
  }
  return 'masked or insufficient coverage';
}

function pointLabel(point: SpectrumPoint): string {
  const frames = `${point.n_frames} frame${point.n_frames === 1 ? '' : 's'}`;
  if (point.flux_mjy === null) {
    return `${formatWavelength(point.wavelength_um)} · ${maskedLabel(point)} · ${frames}`;
  }
  if (point.detected) {
    return `${formatWavelength(point.wavelength_um)} · ${formatFluxMjy(
      point.flux_mjy,
    )} ± ${formatFluxMjy(point.flux_err_mjy)} · ${frames}`;
  }
  return `${formatWavelength(point.wavelength_um)} · upper limit ${formatFluxMjy(
    point.upper_limit_mjy,
  )} · ${frames}`;
}

/**
 * Quick-look SED. Points are per-wavelength aperture samples, not a
 * calibrated spectrum and not band-averaged medians. Null flux is a masked
 * gap: it is drawn as a marker, never as zero and never connected by a line.
 */
export function SpectrumView({
  spectrum,
  wavelengthRange: wavelengthRangeProp = null,
}: {
  spectrum: Spectrum | undefined;
  wavelengthRange?: WavelengthRange | null;
}) {
  const wavelengthRange = normalizeWavelengthRange(wavelengthRangeProp);
  if (!spectrum) {
    return <p className="m-0 text-[12px] text-haze">The SED has not loaded.</p>;
  }

  const points = [...(spectrum.points ?? [])].sort(
    (a, b) => a.wavelength_um - b.wavelength_um,
  );

  const measured = points.filter(
    (point) =>
      point.flux_mjy !== null &&
      Number.isFinite(point.flux_mjy) &&
      (point.detected || (point.upper_limit_mjy !== null && Number.isFinite(point.upper_limit_mjy))),
  );

  const ys = points.flatMap((point) => {
    if (point.flux_mjy !== null && point.detected) {
      const err = Math.abs(point.flux_err_mjy ?? 0);
      return [point.flux_mjy - err, point.flux_mjy + err];
    }
    if (point.upper_limit_mjy !== null) return [point.upper_limit_mjy];
    return [];
  });

  const isOk = spectrum.status === 'ok';
  const canRender = measured.length > 0 && ys.length > 0;

  if (!canRender) {
    if (!isOk || points.length === 0) {
      return (
        <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bar px-3 py-3">
          <p className="m-0 text-[13px] font-medium text-mist">
            Not enough data for a spectral energy distribution
          </p>
          <p className="m-0 text-[12px] leading-snug text-haze">
            {spectrum.reason ?? 'The archive did not return usable SED points.'}
          </p>
          {spectrum.method?.note && (
            <p className="m-0 text-[11px] leading-snug text-haze">{spectrum.method.note}</p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bar px-3 py-3">
        <p className="m-0 text-[13px] font-medium text-mist">Every band is masked</p>
        <p className="m-0 text-[12px] leading-snug text-haze">
          The SED has {points.length} wavelength bin{points.length === 1 ? '' : 's'}, but none
          carries a usable flux or upper limit.
        </p>
        {spectrum.method?.note && (
          <p className="m-0 text-[11px] leading-snug text-haze">{spectrum.method.note}</p>
        )}
      </div>
    );
  }

  const width = 640;
  const height = 230;
  const pad = { top: 16, right: 16, bottom: 36, left: 58 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  let xMin = Math.min(...points.map((point) => point.wavelength_um));
  let xMax = Math.max(...points.map((point) => point.wavelength_um));
  if (xMax === xMin) {
    const padX = Math.max(0.05, Math.abs(xMin) * 0.05);
    xMin -= padX;
    xMax += padX;
  }
  const xSpan = xMax - xMin;

  // Bars encode magnitude from zero flux, so the y axis is anchored at 0.
  const yMin = 0;
  const yTop = Math.max(...ys, 0);
  const yMax = yTop === 0 ? 1 : yTop * 1.1;

  const xScale = (value: number) =>
    pad.left + ((value - xMin) / xSpan) * plotWidth;
  const yScale = (value: number) =>
    pad.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
  const inSelectedRange = (point: SpectrumPoint) =>
    !wavelengthRange || inWavelengthRange(point.wavelength_um, wavelengthRange);
  const rangeLow = wavelengthRange ? Math.max(xMin, wavelengthRange[0]) : null;
  const rangeHigh = wavelengthRange ? Math.min(xMax, wavelengthRange[1]) : null;
  const hasRangeBand = rangeLow !== null && rangeHigh !== null && rangeLow <= rangeHigh;

  const xTicks =
    points.length <= 14
      ? points.map((point) => point.wavelength_um)
      : [0, 0.25, 0.5, 0.75, 1].map((fraction) => xMin + fraction * xSpan);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(
    (fraction) => yMin + fraction * (yMax - yMin),
  );

  const detected = points.filter((point) => point.detected && point.flux_mjy !== null);
  const maskedCount = points.filter((point) => point.flux_mjy === null).length;
  const limitCount = points.filter(
    (point) => !point.detected && point.flux_mjy !== null && point.upper_limit_mjy !== null,
  ).length;
  const noLimitCount = points.filter(
    (point) => !point.detected && point.flux_mjy !== null && point.upper_limit_mjy === null,
  ).length;

  // Each bar owns the midpoint gap to its neighbours, like a histogram over
  // the real (non-uniform) wavelength bins.
  const barEdges = points.map((point, index) => {
    const prev = points[index - 1]?.wavelength_um;
    const next = points[index + 1]?.wavelength_um;
    const fallback = xSpan * 0.08;
    const left =
      prev === undefined
        ? point.wavelength_um - (next === undefined ? fallback : (next - point.wavelength_um) / 2)
        : (prev + point.wavelength_um) / 2;
    const right =
      next === undefined
        ? point.wavelength_um + (prev === undefined ? fallback : (point.wavelength_um - prev) / 2)
        : (next + point.wavelength_um) / 2;
    return [Math.max(xMin, left), Math.min(xMax, right)] as const;
  });
  const baselineY = yScale(yMin);

  return (
    <div className="flex flex-col gap-2">
      {!isOk && (
        <div className="rounded-lg border border-line bg-bar px-3 py-2">
          <p className="m-0 text-[12px] font-medium text-mist">
            Not enough data for a spectral energy distribution
          </p>
          <p className="m-0 text-[11px] leading-snug text-haze">
            {spectrum.reason ?? 'The archive did not return enough detected wavelength bins.'}
          </p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${isOk ? 'Quick-look spectral energy distribution' : 'Partial wavelength measurements'}: ${detected.length} detected bins, ${limitCount} upper limits${
          noLimitCount > 0 ? `, ${noLimitCount} non-detections without a stored limit` : ''
        } and ${maskedCount} masked bins across ${points.length} wavelengths.`}
      >
        <rect x="0" y="0" width={width} height={height} fill="#0c1220" rx="8" />

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#1b2438"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={yScale(tick) + 3.5}
              textAnchor="end"
              fill="#7f8ba5"
              fontSize="9.5"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {formatFluxMjy(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick, index) => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#1b2438"
              strokeWidth="1"
            />
            <text
              x={xScale(tick)}
              y={height - pad.bottom + 14}
              textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'}
              fill="#7f8ba5"
              fontSize="9.5"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {formatWavelength(tick)}
            </text>
          </g>
        ))}

        {hasRangeBand && rangeLow !== null && rangeHigh !== null && (
          <g aria-hidden="true">
            <rect
              x={xScale(rangeLow)}
              y={pad.top}
              width={Math.max(1, xScale(rangeHigh) - xScale(rangeLow))}
              height={plotHeight}
              fill="#feb832"
              fillOpacity="0.07"
            />
            <line
              x1={xScale(rangeLow)}
              x2={xScale(rangeLow)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#feb832"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <line
              x1={xScale(rangeHigh)}
              x2={xScale(rangeHigh)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#feb832"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
          </g>
        )}

        {points.map((point, index) => {
          const [edgeLeft, edgeRight] = barEdges[index];
          const x0 = xScale(edgeLeft);
          const x1 = xScale(edgeRight);
          const barWidth = Math.max(2, x1 - x0);
          const barX = (x0 + x1 - barWidth) / 2;
          const cx = (x0 + x1) / 2;
          const dimmed = !inSelectedRange(point);
          const groupOpacity = dimmed ? 0.22 : 1;

          if (point.flux_mjy === null) {
            return (
              <g key={`masked-${point.wavelength_um}`} opacity={groupOpacity}>
                <rect
                  x={barX}
                  y={baselineY - 3}
                  width={barWidth}
                  height={3}
                  fill={MASKED}
                  opacity="0.45"
                />
                <line
                  x1={cx}
                  x2={cx}
                  y1={pad.top}
                  y2={baselineY}
                  stroke={MASKED}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  strokeOpacity="0.55"
                />
                <text
                  x={cx}
                  y={pad.top - 4}
                  textAnchor="middle"
                  fill={MASKED}
                  fontSize="9"
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  ×
                </text>
                <title>{pointLabel(point)}</title>
              </g>
            );
          }

          if (!point.detected) {
            if (point.upper_limit_mjy === null) {
              return (
                <g key={`limit-missing-${point.wavelength_um}`} opacity={groupOpacity}>
                  <line
                    x1={cx}
                    x2={cx}
                    y1={pad.top}
                    y2={baselineY}
                    stroke={MASKED}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    strokeOpacity="0.55"
                  />
                  <text
                    x={cx}
                    y={pad.top - 4}
                    textAnchor="middle"
                    fill={MASKED}
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                  >
                    ×
                  </text>
                  <title>{`${pointLabel(point)} · no upper limit stored`}</title>
                </g>
              );
            }
            const y = yScale(point.upper_limit_mjy);
            return (
              <g key={`limit-${point.wavelength_um}`} opacity={groupOpacity}>
                <rect
                  x={barX}
                  y={y}
                  width={barWidth}
                  height={Math.max(1, baselineY - y)}
                  fill="none"
                  stroke={LIMIT}
                  strokeWidth="1.2"
                />
                <path
                  d={`M${cx - 3.5},${y - 3.5} L${cx + 3.5},${y - 3.5} L${cx},${y + 3.5} Z`}
                  fill="none"
                  stroke={LIMIT}
                  strokeWidth="1.1"
                />
                <title>{pointLabel(point)}</title>
              </g>
            );
          }

          const y = yScale(point.flux_mjy);
          const err = Math.abs(point.flux_err_mjy ?? 0);
          const yHigh = yScale(point.flux_mjy + err);
          const yLow = Math.max(yScale(point.flux_mjy - err), baselineY);
          const cap = Math.min(barWidth * 0.45, 7);
          return (
            <g key={`detected-${point.wavelength_um}`} opacity={groupOpacity}>
              <rect
                x={barX}
                y={y}
                width={barWidth}
                height={Math.max(1, baselineY - y)}
                fill={DETECTED}
                fillOpacity="0.85"
              />
              <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={DETECTED} strokeWidth="1.1" />
              <line x1={cx - cap} x2={cx + cap} y1={yHigh} y2={yHigh} stroke={DETECTED} strokeWidth="1.1" />
              <line x1={cx - cap} x2={cx + cap} y1={yLow} y2={yLow} stroke={DETECTED} strokeWidth="1.1" />
              <title>{pointLabel(point)}</title>
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
        <line
          x1={pad.left}
          x2={pad.left}
          y1={pad.top}
          y2={height - pad.bottom}
          stroke="#3b4a69"
          strokeWidth="1"
        />
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        {wavelengthRange && (
          <span className="inline-flex items-center gap-1.5 text-amber-soft">
            range {formatWavelengthRange(wavelengthRange)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: DETECTED }} />
          detected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="text-[11px]" style={{ color: LIMIT }}>
            ▽
          </span>
          upper limit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" style={{ color: MASKED }}>
            ×
          </span>
          masked (no flux)
        </span>
        <span className="ml-auto">flux in MJy</span>
      </div>

      <p className="m-0 max-w-[70ch] text-[11px] leading-snug text-haze">
        {isOk
          ? 'Quick-look spectral energy distribution: single-frame aperture samples per wavelength,'
          : 'Partial wavelength measurements: single-frame aperture samples per wavelength,'}{' '}
        not band-averaged medians and not a calibrated spectrum.
        {spectrum.method?.note ? ` ${spectrum.method.note}` : ''}
      </p>
    </div>
  );
}
