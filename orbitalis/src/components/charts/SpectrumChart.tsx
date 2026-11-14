import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { useWidth } from '@/lib/useWidth';
import { chartFor } from '@/lib/palette';
import { useUi } from '@/store/useUi';

interface Props {
  spectrum: number[];
  median: number[];
  /** 1-indexed inclusive range flagged as anomalous. */
  flagged: [number, number] | null;
  /** 1-indexed inclusive range chosen with the band strip in the explorer. */
  bandRange: [number, number] | null;
  height?: number;
  /** Hide the field-median series (used by the compact explorer tray). */
  showMedian?: boolean;
}

const MONO = '11px "JetBrains Mono Variable", ui-monospace, monospace';

/** 102-band spectrum: bars for the candidate (accent where flagged), a line for the field median. */
export function SpectrumChart({ spectrum, median, flagged, bandRange, height = 240, showMedian = true }: Props) {
  const [wrapRef, measured] = useWidth<HTMLDivElement>();
  const mount = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const theme = useUi((s) => s.theme);
  const rangesRef = useRef({ flagged, bandRange });
  rangesRef.current = { flagged, bandRange };

  const width = Math.max(320, measured || 800);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const chart = chartFor(theme);
    const axis = {
      stroke: chart.axis,
      font: MONO,
      grid: { stroke: chart.grid, width: 1 },
      ticks: { stroke: chart.ticks, width: 1 },
    };
    const x = spectrum.map((_, i) => i + 1);
    const inFlag = (b: number) => flagged !== null && b >= flagged[0] && b <= flagged[1];
    const normal = spectrum.map((v, i) => (inFlag(i + 1) ? null : v));
    const hot = spectrum.map((v, i) => (inFlag(i + 1) ? v : null));
    const fmt = (_u: uPlot, v: number | null) => (v == null ? '–' : v.toFixed(3));
    const bars = uPlot.paths.bars?.({ size: [0.8, 100] });

    const shade = (u: uPlot, a: number, b: number, fill: string, stroke?: string) => {
      const x0 = u.valToPos(a - 0.5, 'x', true);
      const x1 = u.valToPos(b + 0.5, 'x', true);
      const { top, height: h } = u.bbox;
      u.ctx.save();
      u.ctx.fillStyle = fill;
      u.ctx.fillRect(x0, top, x1 - x0, h);
      if (stroke) {
        u.ctx.strokeStyle = stroke;
        u.ctx.setLineDash([6, 4]);
        u.ctx.lineWidth = 1.5;
        u.ctx.strokeRect(x0, top, x1 - x0, h);
      }
      u.ctx.restore();
    };

    const series: uPlot.Series[] = [
      { label: 'Band' },
      { label: 'Candidate', stroke: chart.candidate, fill: chart.candidate, paths: bars, points: { show: false }, value: fmt },
      { label: 'Flagged bands', stroke: chart.flagged, fill: chart.flagged, paths: bars, points: { show: false }, value: fmt },
    ];
    if (showMedian) {
      series.push({ label: 'Field median', stroke: chart.median, width: 2, points: { show: false }, value: fmt });
    }

    const opts: uPlot.Options = {
      width,
      height,
      padding: [8, 8, 0, 0],
      legend: { show: showMedian },
      scales: { x: { time: false, range: [0.5, spectrum.length + 0.5] }, y: { range: [0, 0.9] } },
      axes: [
        {
          ...axis,
          label: 'band',
          labelFont: MONO,
          labelSize: 20,
          values: (_u, v) => v.map((n) => (Number.isInteger(n) ? String(n) : '')),
        },
        { ...axis, size: 40, values: (_u, v) => v.map((n) => n.toFixed(1)) },
      ],
      series,
      cursor: { drag: { x: false, y: false }, points: { show: false } },
      hooks: {
        drawClear: [
          (u) => {
            const r = rangesRef.current;
            if (r.flagged) shade(u, r.flagged[0], r.flagged[1], chart.flaggedFill);
            if (r.bandRange) shade(u, r.bandRange[0], r.bandRange[1], chart.bandRangeFill, chart.bandRangeStroke);
          },
        ],
      },
    };

    const data: uPlot.AlignedData = showMedian
      ? [x, normal, hot, median]
      : [x, normal, hot];
    const plot = new uPlot(opts, data, el);
    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
    // Re-create when the data, theme or width changes; ranges are read through a ref.
  }, [spectrum, median, flagged, width, height, showMedian, theme]);

  useEffect(() => {
    plotRef.current?.redraw();
  }, [bandRange]);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={mount}
        role="img"
        aria-label={`Spectrum across ${spectrum.length} bands compared with the field median${flagged ? `. Bands ${flagged[0]} to ${flagged[1]} are flagged.` : '.'}`}
      />
    </div>
  );
}
