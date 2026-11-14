import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import type { Spectrum, SpectrumPoint } from '@/data/types';
import { formatFluxMjy, formatWavelengthRange } from '@/lib/format';
import { useWidth } from '@/lib/useWidth';
import { normalizeWavelengthRange, type WavelengthRange } from '@/lib/wavelength';

const DETECTED = '#55d6e8';
const UNDETECTED = '#3b4a69';
const MASKED = '#5b6884';

const MONO = '12px "IBM Plex Mono", monospace';
const AXIS = {
  stroke: '#8A94AB',
  font: MONO,
  grid: { stroke: '#1E2840', width: 1 },
  ticks: { stroke: '#2B3550', width: 1 },
};

interface SpectrumPlotProps {
  points: SpectrumPoint[];
  wavelengthRange: WavelengthRange | null;
  ariaLabel: string;
}

/**
 * uPlot rendering of the quick-look SED over real wavelengths: bars for
 * detected bins, markers for upper limits, gaps for masked bins. The selected
 * wavelength range is shaded like the explorer band filter; it never implies a
 * calibrated spectrum.
 */
function SpectrumPlot({ points, wavelengthRange, ariaLabel }: SpectrumPlotProps) {
  const [wrapRef, measured] = useWidth<HTMLDivElement>();
  const mount = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const rangeRef = useRef(wavelengthRange);
  rangeRef.current = wavelengthRange;

  const width = Math.max(320, measured || 800);

  const { x, detected, limits, xMin, xMax, xPad, yMax } = useMemo(() => {
    const x = points.map((point) => point.wavelength_um);
    const detected = points.map((point) =>
      point.detected && point.flux_mjy !== null && Number.isFinite(point.flux_mjy)
        ? point.flux_mjy
        : null,
    );
    const limits = points.map((point) =>
      !point.detected && point.upper_limit_mjy !== null && Number.isFinite(point.upper_limit_mjy)
        ? point.upper_limit_mjy
        : null,
    );
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const xPad =
      xMax === xMin ? Math.max(0.05, Math.abs(xMin) * 0.05) : (xMax - xMin) * 0.03;
    const yMax =
      Math.max(
        ...detected.filter((value): value is number => value !== null),
        ...limits.filter((value): value is number => value !== null),
        0,
      ) * 1.1 || 1;
    return { x, detected, limits, xMin, xMax, xPad, yMax };
  }, [points]);

  const canvasSupported = useMemo(() => {
    try {
      return typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d');
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const el = mount.current;
    if (!el || !canvasSupported) return;

    const fmt = (_u: uPlot, v: number | null) => (v == null ? '–' : formatFluxMjy(v));
    const bars = uPlot.paths.bars?.({ size: [0.8, 100] });

    const shade = (u: uPlot, a: number, b: number, fill: string, stroke?: string) => {
      const x0 = u.valToPos(a, 'x', true);
      const x1 = u.valToPos(b, 'x', true);
      const { top, height } = u.bbox;
      u.ctx.save();
      u.ctx.fillStyle = fill;
      u.ctx.fillRect(x0, top, x1 - x0, height);
      if (stroke) {
        u.ctx.strokeStyle = stroke;
        u.ctx.setLineDash([6, 4]);
        u.ctx.lineWidth = 1.5;
        u.ctx.strokeRect(x0, top, x1 - x0, height);
      }
      u.ctx.restore();
    };

    const opts: uPlot.Options = {
      width,
      height: 260,
      padding: [8, 8, 0, 0],
      scales: {
        x: { time: false, range: [xMin - xPad, xMax + xPad] },
        y: { range: [0, yMax] },
      },
      axes: [
        {
          ...AXIS,
          label: 'µm',
          labelFont: MONO,
          labelSize: 22,
          values: (_u, vals) => vals.map((v) => v.toFixed(2)),
        },
        {
          ...AXIS,
          size: 56,
          values: (_u, vals) => vals.map((v) => (v === 0 ? '0' : v.toExponential(1))),
        },
      ],
      series: [
        { label: 'Wavelength' },
        {
          label: 'Detected',
          stroke: DETECTED,
          fill: DETECTED,
          paths: bars,
          points: { show: false },
          value: fmt,
        },
        {
          label: 'Upper limit',
          stroke: UNDETECTED,
          fill: 'rgba(59,74,105,0.5)',
          paths: bars,
          points: { show: false },
          value: fmt,
        },
      ],
      cursor: { drag: { x: false, y: false }, points: { show: false } },
      hooks: {
        drawClear: [
          (u) => {
            const range = rangeRef.current;
            if (range) {
              shade(u, Math.max(xMin - xPad, range[0]), Math.min(xMax + xPad, range[1]), 'rgba(165,150,255,0.14)', '#A596FF');
            }
          },
        ],
      },
    };

    const plot = new uPlot(opts, [x, detected, limits], el);
    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
    // Re-create when the data or width changes; the range is read through a ref.
  }, [x, detected, limits, xMin, xMax, xPad, yMax, width, canvasSupported]);

  useEffect(() => {
    plotRef.current?.redraw();
  }, [wavelengthRange]);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={mount}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}

/**
 * Quick-look SED. Points are per-wavelength aperture samples, not a
 * calibrated spectrum and not band-averaged medians. Null flux is a masked
 * gap: it is never drawn as zero and never connected by a line.
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

  const detected = points.filter((point) => point.detected && point.flux_mjy !== null);
  const maskedCount = points.filter((point) => point.flux_mjy === null).length;
  const limitCount = points.filter(
    (point) => !point.detected && point.flux_mjy !== null && point.upper_limit_mjy !== null,
  ).length;
  const noLimitCount = points.filter(
    (point) => !point.detected && point.flux_mjy !== null && point.upper_limit_mjy === null,
  ).length;

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
      <SpectrumPlot
        points={points}
        wavelengthRange={wavelengthRange}
        ariaLabel={`${
          isOk ? 'Quick-look spectral energy distribution' : 'Partial wavelength measurements'
        }: ${detected.length} detected bins, ${limitCount} upper limits${
          noLimitCount > 0 ? `, ${noLimitCount} non-detections without a stored limit` : ''
        } and ${maskedCount} masked bins across ${points.length} wavelengths.`}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        {wavelengthRange && (
          <span className="inline-flex items-center gap-1.5 text-violet">
            range {formatWavelengthRange(wavelengthRange)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-1.5" style={{ background: DETECTED }} />
          detected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-1.5 rounded-[1px]"
            style={{ background: 'rgba(59,74,105,0.5)', outline: `1px solid ${UNDETECTED}` }}
          />
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
