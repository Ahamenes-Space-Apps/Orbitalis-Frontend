import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { useWidth } from '@/lib/useWidth';
import { chartFor, paletteFor } from '@/lib/palette';
import { useUi } from '@/store/useUi';

interface Props {
  /** Offsets from the epoch 1 position, arcseconds. */
  offsets: { dx: number; dy: number }[];
  /** 1σ position error, arcseconds. */
  sigma: number;
}

/** Sky-plane track: one dot per epoch, dashed circles for the 1σ position error. Equal scale on both axes. */
export function MotionPlot({ offsets, sigma }: Props) {
  const [wrapRef, measured] = useWidth<HTMLDivElement>();
  const mount = useRef<HTMLDivElement>(null);
  const theme = useUi((s) => s.theme);
  const width = Math.max(300, Math.min(520, measured || 480));

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const palette = paletteFor(theme);
    const chart = chartFor(theme);
    const xs = offsets.map((o) => o.dx);
    const ys = offsets.map((o) => o.dy);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const pad = Math.max(1, sigma * 3, spanX * 0.25, spanY * 0.25);
    const x0 = Math.min(...xs) - pad;
    const x1 = Math.max(...xs) + pad;
    const y0 = Math.min(...ys) - pad;
    const y1 = Math.max(...ys) + pad;

    const marginLeft = 52;
    const marginRight = 16;
    const pxPerArcsec = (width - marginLeft - marginRight) / (x1 - x0);
    const pts = offsets.map((o, i) => ({ x: o.dx, y: o.dy, tag: `E${i + 1}` }));

    const plot = Plot.plot({
      width,
      aspectRatio: 1,
      marginLeft,
      marginRight,
      marginBottom: 44,
      style: {
        background: 'transparent',
        color: palette.mist,
        fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
        fontSize: '11px',
        overflow: 'visible',
      },
      x: { domain: [x0, x1], label: 'ΔRA·cos δ (″) →', grid: true, ticks: 6 },
      y: { domain: [y0, y1], label: '↑ ΔDec (″)', grid: true, ticks: 6 },
      marks: [
        Plot.ruleX([0], { stroke: chart.ticks }),
        Plot.ruleY([0], { stroke: chart.ticks }),
        Plot.line(pts, { x: 'x', y: 'y', stroke: palette.accent, strokeOpacity: 0.75, strokeWidth: 2 }),
        Plot.dot(pts, { x: 'x', y: 'y', r: Math.max(3, sigma * pxPerArcsec), stroke: chart.axis, strokeDasharray: '3 3', fill: 'none' }),
        Plot.dot(pts, { x: 'x', y: 'y', r: 4.5, fill: palette.accent }),
        Plot.text(pts, { x: 'x', y: 'y', text: 'tag', dx: 12, dy: -10, fill: palette.ink }),
      ],
    });
    el.replaceChildren(plot);
    return () => {
      plot.remove();
    };
  }, [offsets, sigma, width, theme]);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={mount}
        role="img"
        aria-label={`Sky-plane track over ${offsets.length} epochs, offsets in arcseconds from the epoch 1 position`}
      />
    </div>
  );
}
