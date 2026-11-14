import { useMemo } from 'react';
import type { CandidateSummary } from '@/data/types';
import { deltaMagAt } from '@/lib/epochs';
import { useWidth } from '@/lib/useWidth';

export function PhotometryCurve({
  candidate,
  epoch,
}: {
  candidate: CandidateSummary;
  epoch: number;
}) {
  const [ref, measured] = useWidth<HTMLDivElement>();
  const width = Math.max(220, measured || 300);
  const height = 96;
  const pad = { l: 36, r: 10, t: 10, b: 20 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const points = useMemo(
    () =>
      candidate.positions.map((_, i) => ({
        epoch: i + 1,
        value: deltaMagAt(i + 1, candidate),
      })),
    [candidate],
  );

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, 0);
  const hi = Math.max(...values, 0);
  const span = Math.max(0.04, hi - lo);
  const y = (v: number) => pad.t + innerH - ((v - lo) / span) * innerH;
  const x = (e: number) => pad.l + ((e - 1) / Math.max(1, points.length - 1)) * innerW;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.epoch).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label="Six-epoch photometric delta magnitude curve">
        <line x1={pad.l} y1={y(0)} x2={pad.l + innerW} y2={y(0)} stroke="var(--line-2)" strokeDasharray="3 3" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="var(--line-2)" />
        <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="var(--line-2)" />
        <text x={pad.l - 4} y={y(hi) + 3} fill="var(--haze)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
          {hi.toFixed(2)}
        </text>
        <text x={pad.l - 4} y={y(lo) + 3} fill="var(--haze)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
          {lo.toFixed(2)}
        </text>
        <text x={2} y={pad.t + 4} fill="var(--haze)" fontSize="7" fontFamily="var(--font-mono)">
          Δmag
        </text>

        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
        {points.map((p) => {
          const active = p.epoch === epoch;
          return (
            <g key={p.epoch}>
              <circle
                cx={x(p.epoch)}
                cy={y(p.value)}
                r={active ? 3.2 : 2.2}
                fill={active ? 'var(--accent)' : 'var(--panel)'}
                stroke="var(--accent)"
                strokeWidth="1.2"
              />
              <text
                x={x(p.epoch)}
                y={height - 6}
                fill={active ? 'var(--ink)' : 'var(--haze)'}
                fontSize="8"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                E{p.epoch}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
