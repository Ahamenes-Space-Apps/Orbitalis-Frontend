import { useMemo, useRef, type KeyboardEvent } from 'react';
import type { Frame, Spectrum } from '@/data/types';
import { formatWavelength, formatWavelengthRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  inWavelengthRange,
  normalizeWavelengthRange,
  wavelengthKey,
  type WavelengthRange,
} from '@/lib/wavelength';

interface WavelengthCoverageProps {
  frames: Array<Pick<Frame, 'wavelength_um' | 'detector'>>;
  spectrum?: Spectrum | null;
  selectedWavelength?: number | null;
  selection?: WavelengthRange | null;
  onSelectionChange?: (range: WavelengthRange | null) => void;
  className?: string;
}

interface Bin {
  wavelength: number;
  count: number;
  detectors: number[];
}

/**
 * Wavelength coverage from stored frame metadata and SED bins. When a change
 * handler is supplied, dragging or using the arrow keys selects a real
 * wavelength interval; it never implies a calibrated band index.
 */
export function WavelengthCoverage({
  frames,
  spectrum,
  selectedWavelength = null,
  selection = null,
  onSelectionChange,
  className,
}: WavelengthCoverageProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const dragAnchor = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const spectrumPoints = useMemo(
    () => (spectrum?.points ?? []).filter((point) => Number.isFinite(point.wavelength_um)),
    [spectrum],
  );

  const bins = useMemo(() => {
    const grouped = new Map<number, Bin>();
    for (const frame of frames) {
      if (!Number.isFinite(frame.wavelength_um)) continue;
      const wavelength = wavelengthKey(frame.wavelength_um);
      const bin = grouped.get(wavelength);
      if (bin) {
        bin.count += 1;
        if (!bin.detectors.includes(frame.detector)) bin.detectors.push(frame.detector);
      } else {
        grouped.set(wavelength, { wavelength, count: 1, detectors: [frame.detector] });
      }
    }
    return grouped;
  }, [frames]);

  const ordered = useMemo(
    () => [...bins.values()].sort((a, b) => a.wavelength - b.wavelength),
    [bins],
  );

  const coverageWavelengths = useMemo(() => {
    const values = new Set<number>();
    for (const bin of ordered) values.add(bin.wavelength);
    for (const point of spectrumPoints) values.add(wavelengthKey(point.wavelength_um));
    return [...values].sort((a, b) => a - b);
  }, [ordered, spectrumPoints]);

  const domain = useMemo(() => {
    if (coverageWavelengths.length === 0) return null;
    return { min: coverageWavelengths[0], max: coverageWavelengths[coverageWavelengths.length - 1] };
  }, [coverageWavelengths]);

  if (!domain) {
    return (
      <p className={className ?? 'm-0 text-[11px] text-haze'}>
        Wavelength coverage appears once frames are stored.
      </p>
    );
  }

  const { min, max } = domain;
  const span = Math.max(max - min, 1e-6);
  const activeRange = normalizeWavelengthRange(selection);
  const interactive = Boolean(onSelectionChange);

  const width = 640;
  const height = 112;
  const pad = { top: 18, right: 12, bottom: 22, left: 12 };
  const plotWidth = width - pad.left - pad.right;
  const histogramHeight = 42;
  const sedBarHeight = 14;
  const sedBaseline = pad.top + histogramHeight + 28;
  const sedTop = sedBaseline - sedBarHeight;

  const xScale = (value: number) => pad.left + ((value - min) / span) * plotWidth;

  const framesInRange = activeRange
    ? frames.filter((frame) => inWavelengthRange(frame.wavelength_um, activeRange)).length
    : frames.length;
  const sedInRange = activeRange
    ? spectrumPoints.filter((point) => inWavelengthRange(point.wavelength_um, activeRange)).length
    : spectrumPoints.length;

  const maxCount = Math.max(...ordered.map((bin) => bin.count), 1);
  const slotCount = Math.max(coverageWavelengths.length, 1);
  const barWidth = Math.max(1.5, Math.min(12, plotWidth / slotCount - 1));
  const detectors = [...new Set(frames.map((frame) => frame.detector))].sort((a, b) => a - b);
  const selected =
    selectedWavelength !== null && Number.isFinite(selectedWavelength) ? selectedWavelength : null;
  const selectedKey = selected !== null ? wavelengthKey(selected) : null;

  const clampWavelength = (value: number) => Math.min(max, Math.max(min, value));
  const snapRange = (a: number, b: number): WavelengthRange => {
    const low = wavelengthKey(clampWavelength(Math.min(a, b)));
    const high = wavelengthKey(clampWavelength(Math.max(a, b)));
    return [low, high];
  };

  const wavelengthAt = (clientX: number) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || max === min) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const x = pad.left + ratio * plotWidth;
    return min + ((x - pad.left) / plotWidth) * (max - min);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelectionChange) return;
    if (event.key === 'Escape') {
      onSelectionChange(null);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const step = Math.max((max - min) / 40, 0.01);
    let next: WavelengthRange;

    if (!activeRange) {
      next =
        direction === 1 ? snapRange(min, min + step) : snapRange(max - step, max);
    } else if (event.shiftKey) {
      next = snapRange(activeRange[0], activeRange[1] + direction * step);
    } else {
      const widthOfRange = activeRange[1] - activeRange[0];
      const latestStart = Math.max(min, max - widthOfRange);
      const nextStart = Math.min(latestStart, Math.max(min, activeRange[0] + direction * step));
      next = snapRange(nextStart, nextStart + widthOfRange);
    }
    onSelectionChange(next);
  };

  const rangeLabel = activeRange ? formatWavelengthRange(activeRange) : formatWavelengthRange([min, max]);
  const rangeSummary = activeRange
    ? `${framesInRange} of ${frames.length} frames`
    : `all ${frames.length} frames`;
  const sedSummary = spectrumPoints.length
    ? activeRange
      ? `${sedInRange} of ${spectrumPoints.length} SED bins`
      : `all ${spectrumPoints.length} SED bins`
    : null;

  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] text-mist" data-testid="wavelength-range-label">
          {rangeLabel} · {rangeSummary}
          {sedSummary ? ` · ${sedSummary}` : ''}
        </span>
        {activeRange && onSelectionChange && (
          <button
            type="button"
            onClick={() => onSelectionChange(null)}
            className="cursor-pointer rounded border border-line-2 px-1.5 py-0.5 font-mono text-[9px] text-haze hover:border-amber/60 hover:text-amber"
          >
            All wavelengths
          </button>
        )}
      </div>

      <div
        ref={plotRef}
        role={interactive ? 'group' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={
          interactive
            ? 'Wavelength range selector. Drag horizontally or use the arrow keys; Escape clears the range.'
            : undefined
        }
        onPointerDown={(event) => {
          if (!onSelectionChange || event.button !== 0) return;
          const value = wavelengthAt(event.clientX);
          if (value === null) return;
          dragAnchor.current = value;
          dragMoved.current = false;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!onSelectionChange || dragAnchor.current === null) return;
          const value = wavelengthAt(event.clientX);
          if (value === null) return;
          if (value !== dragAnchor.current) dragMoved.current = true;
          if (dragMoved.current) onSelectionChange(snapRange(dragAnchor.current, value));
        }}
        onPointerUp={(event) => {
          if (dragAnchor.current === null) return;
          if (!dragMoved.current) onSelectionChange?.(null);
          dragAnchor.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragAnchor.current = null;
          dragMoved.current = false;
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative',
          interactive &&
            'cursor-ew-resize touch-none rounded-md outline-none focus-visible:ring-1 focus-visible:ring-amber/60',
        )}
        data-testid="wavelength-coverage-plot"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Wavelength coverage from ${frames.length} stored frames and ${spectrumPoints.length} SED bins: ${coverageWavelengths.length} distinct wavelengths between ${formatWavelength(
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
            const barHeight = (bin.count / maxCount) * histogramHeight;
            const dimmed = activeRange !== null && !inWavelengthRange(bin.wavelength, activeRange);
            const selectedBin = selectedKey !== null && bin.wavelength === selectedKey;
            return (
              <g key={bin.wavelength}>
                <rect
                  data-testid="frame-bin-bar"
                  x={x - barWidth / 2}
                  y={pad.top + histogramHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx="1"
                  fill="#7f8ba5"
                  fillOpacity={dimmed ? 0.16 : selectedBin ? 0.85 : 0.55}
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
            <g data-testid="selected-wavelength-marker">
              <line
                x1={xScale(selected)}
                x2={xScale(selected)}
                y1={pad.top - 4}
                y2={sedBaseline + 4}
                stroke="#e8eef8"
                strokeWidth="1.2"
              />
              <text
                x={xScale(selected)}
                y={pad.top - 7}
                textAnchor="middle"
                fill="#e8eef8"
                fontSize="9"
                fontFamily="'IBM Plex Mono', monospace"
              >
                {formatWavelength(selected)}
              </text>
            </g>
          )}

          <text
            x={pad.left}
            y={sedTop - 4}
            fill="#7f8ba5"
            fontSize="9"
            fontFamily="'IBM Plex Mono', monospace"
          >
            SED bins
          </text>

          {spectrumPoints.length === 0 && (
            <text
              x={width - pad.right}
              y={sedBaseline + 3}
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
            const pointKey = wavelengthKey(point.wavelength_um);
            const dimmed = activeRange !== null && !inWavelengthRange(point.wavelength_um, activeRange);
            const selectedSed = selectedKey !== null && pointKey === selectedKey;
            const masked = point.flux_mjy === null;
            const detected = !masked && point.detected;
            const state = masked
              ? 'masked'
              : detected
                ? 'detected'
                : point.upper_limit_mjy !== null
                  ? 'upper limit'
                  : 'not detected';
            const label = `${formatWavelength(point.wavelength_um)} · ${state} · ${point.n_frames} frame${
              point.n_frames === 1 ? '' : 's'
            }`;
            return (
              <g key={`${point.wavelength_um}-${point.n_frames}`}>
                {masked ? (
                  <rect
                    data-testid="sed-bin-bar"
                    x={x - barWidth / 2}
                    y={sedTop}
                    width={barWidth}
                    height={sedBarHeight}
                    rx="1"
                    fill="#7f8ba5"
                    fillOpacity={dimmed ? 0.06 : selectedSed ? 0.3 : 0.14}
                    stroke="#7f8ba5"
                    strokeOpacity={dimmed ? 0.2 : selectedSed ? 0.8 : 0.55}
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                ) : detected ? (
                  <rect
                    data-testid="sed-bin-bar"
                    x={x - barWidth / 2}
                    y={sedTop}
                    width={barWidth}
                    height={sedBarHeight}
                    rx="1"
                    fill="#7f8ba5"
                    fillOpacity={dimmed ? 0.16 : selectedSed ? 0.95 : 0.7}
                  />
                ) : (
                  <rect
                    data-testid="sed-bin-bar"
                    x={x - barWidth / 2}
                    y={sedTop}
                    width={barWidth}
                    height={sedBarHeight}
                    rx="1"
                    fill="none"
                    stroke="#7f8ba5"
                    strokeOpacity={dimmed ? 0.25 : selectedSed ? 0.95 : 0.7}
                    strokeWidth="1.4"
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
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-haze">
        <span>
          {ordered.length} wavelength{ordered.length === 1 ? '' : 's'} · {frames.length} frame
          {frames.length === 1 ? '' : 's'}
        </span>
        {detectors.length > 0 && (
          <span>detector{detectors.length === 1 ? '' : 's'} {detectors.map((id) => `D${id}`).join(', ')}</span>
        )}
        <span className="ml-auto">
          {interactive ? 'drag or arrow keys · stored wavelengths' : 'read-only · from stored frames'}
        </span>
      </div>
    </div>
  );
}
