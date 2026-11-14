import { useState } from 'react';
import type { ExperimentBin } from '@/data/types';
import { formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';

export function CompletenessChart({
  bins,
  xLabel,
  color = '#55d6e8',
}: {
  bins: ExperimentBin[];
  xLabel: string;
  color?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const series = [...bins].sort((a, b) => a.lo - b.lo);

  if (series.length === 0) {
    return <p className="m-0 text-[12px] text-haze">No completeness bins were stored.</p>;
  }

  const width = 460;
  const height = 170;
  const pad = { top: 14, right: 14, bottom: 30, left: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const lo = series[0].lo;
  const hi = series[series.length - 1].hi;
  const xScale = (value: number) =>
    pad.left + ((value - lo) / Math.max(hi - lo, 1e-9)) * plotWidth;
  const yScale = (value: number) => pad.top + plotHeight - value * plotHeight;

  const points = series.map((bin) => ({
    x: xScale((bin.lo + bin.hi) / 2),
    y: yScale(bin.completeness),
    bin,
  }));

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Completeness against ${xLabel}. ${series.length} bins.`}
      >
        <rect width={width} height={height} fill="#0c1220" rx="8" />
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#1b2438"
            />
            <text
              x={pad.left - 6}
              y={yScale(tick) + 3}
              textAnchor="end"
              fill="#7f8ba5"
              fontSize="9"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
        />
        {points.map((point) => (
          <circle key={`${point.bin.lo}-${point.bin.hi}`} cx={point.x} cy={point.y} r="3" fill={color}>
            <title>
              {`${point.bin.lo.toFixed(2)}–${point.bin.hi.toFixed(2)} ${xLabel}: ${formatPercent(
                point.bin.completeness,
                0,
              )} (${point.bin.n_recovered} of ${point.bin.n_injected})`}
            </title>
          </circle>
        ))}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="#3b4a69"
        />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="#3b4a69" />
        <text x={pad.left} y={height - 8} fill="#7f8ba5" fontSize="9" fontFamily="'IBM Plex Mono', monospace">
          {lo.toFixed(1)}
        </text>
        <text
          x={width - pad.right}
          y={height - 8}
          textAnchor="end"
          fill="#7f8ba5"
          fontSize="9"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {hi.toFixed(1)}
        </text>
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          fill="#7f8ba5"
          fontSize="9"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {xLabel}
        </text>
      </svg>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowTable((value) => !value)}>
          {showTable ? 'Hide table' : 'View as table'}
        </Button>
      </div>

      {showTable && (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full border-collapse text-left text-[11px]">
            <caption className="sr-only">Completeness bins by {xLabel}</caption>
            <thead className="bg-bar text-haze">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-medium">Bin</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Completeness</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Recovered</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Injected</th>
              </tr>
            </thead>
            <tbody>
              {series.map((bin) => (
                <tr key={`${bin.lo}-${bin.hi}`} className="border-t border-line/70">
                  <td className="px-2 py-1.5 font-mono">
                    {bin.lo.toFixed(2)}–{bin.hi.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatPercent(bin.completeness, 0)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{bin.n_recovered}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{bin.n_injected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
