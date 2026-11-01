import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { useWidth } from '@/lib/useWidth';

interface Props {
  spectrum: number[];
  median: number[];
  /** 1-indexed inclusive range flagged as anomalous. */
  flagged: [number, number] | null;
  /** 1-indexed inclusive range chosen with the band strip in the explorer. */
  bandRange: [number, number] | null;
}

const MONO = '12px "IBM Plex Mono", monospace';
const AXIS = {
  stroke: '#8A94AB',
  font: MONO,
  grid: { stroke: '#1E2840', width: 1 },
  ticks: { stroke: '#2B3550', width: 1 },
};

/** 102-band spectrum: bars for the candidate (amber where flagged), a line for the field median. */
export function SpectrumChart({ spectrum, median, flagged, bandRange }: Props) {
  const [wrapRef, measured] = useWidth<HTMLDivElement>();
  const mount = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const rangesRef = useRef({ flagged, bandRange });
  rangesRef.current = { flagged, bandRange };

  const width = Math.max(320, measured || 800);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const x = spectrum.map((_, i) => i + 1);
    const inFlag = (b: number) => flagged !== null && b >= flagged[0] && b <= flagged[1];
    const normal = spectrum.map((v, i) => (inFlag(i + 1) ? null : v));
    const hot = spectrum.map((v, i) => (inFlag(i + 1) ? v : null));
    const fmt = (_u: uPlot, v: number | null) => (v == null ? '–' : v.toFixed(3));
    const bars = uPlot.paths.bars?.({ size: [0.8, 100] });

    const shade = (u: uPlot, a: number, b: number, fill: string, stroke?: string) => {
      const x0 = u.valToPos(a - 0.5, 'x', true);
      const x1 = u.valToPos(b + 0.5, 'x', true);
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
      scales: { x: { time: false, range: [0.5, spectrum.length + 0.5] }, y: { range: [0, 0.9] } },
      axes: [
        { ...AXIS, label: 'band', labelFont: MONO, labelSize: 22, values: (_u, v) => v.map((n) => (Number.isInteger(n) ? String(n) : '')) },
        { ...AXIS, size: 44, values: (_u, v) => v.map((n) => n.toFixed(1)) },
      ],
      series: [
        { label: 'Band' },
        { label: 'Candidate', stroke: '#5B6A94', fill: '#5B6A94', paths: bars, points: { show: false }, value: fmt },
        { label: 'Flagged bands', stroke: '#F2B544', fill: '#F2B544', paths: bars, points: { show: false }, value: fmt },
        { label: 'Field median', stroke: '#E6EAF2', width: 2, points: { show: false }, value: fmt },
      ],
      cursor: { drag: { x: false, y: false }, points: { show: false } },
      hooks: {
        drawClear: [
          (u) => {
            const r = rangesRef.current;
            if (r.flagged) shade(u, r.flagged[0], r.flagged[1], 'rgba(242,181,68,0.12)');
            if (r.bandRange) shade(u, r.bandRange[0], r.bandRange[1], 'rgba(165,150,255,0.14)', '#A596FF');
          },
        ],
      },
    };

    const plot = new uPlot(opts, [x, normal, hot, median], el);
    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
    // Re-create when the data or width changes; ranges are read through a ref and redrawn below.
  }, [spectrum, median, flagged, width]);

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
