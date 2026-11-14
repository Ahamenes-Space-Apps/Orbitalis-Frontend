import { useMemo, useState } from 'react';
import type { CandidateDetail } from '@/data/types';
import {
  SPECTRAL_DIAGNOSTICS,
  bandAtWavelength,
  bandLabel,
  bandWavelength,
  spectrumPoints,
} from '@/lib/epochs';
import { useWidth } from '@/lib/useWidth';
import { cn } from '@/lib/utils';

interface Props {
  candidate: CandidateDetail | null;
  epoch: number;
  className?: string;
  height?: number;
  compact?: boolean;
}

export function SpectralTray({ candidate, epoch, className, height = 108, compact = false }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(
    () => (candidate ? spectrumPoints(candidate, epoch) : []),
    [candidate, epoch],
  );

  const pad = { l: 34, r: 12, t: compact ? 20 : 28, b: compact ? 18 : 26 };
  const w = Math.max(320, width || 900);
  const innerW = Math.max(1, w - pad.l - pad.r);
  const innerH = Math.max(1, height - pad.t - pad.b);
  const max = Math.max(0.01, ...points.map((p) => Math.max(p.flux, p.baseline)));
  const min = Math.min(0, ...points.map((p) => Math.min(p.flux, p.baseline)));

  const x = (band: number) => pad.l + ((band - 1) / 101) * innerW;
  const y = (v: number) => pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;

  const activePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.band).toFixed(2)},${y(p.flux).toFixed(2)}`)
    .join(' ');
  const baselinePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.band).toFixed(2)},${y(p.baseline).toFixed(2)}`)
    .join(' ');

  const active = hover !== null ? points.find((p) => p.band === hover) : null;
  const markers = compact ? [600, 900, 1800, 3600] : [900, 1800, 2700, 3600, 4500];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = event.clientX - rect.left - pad.l;
    const f = Math.max(0, Math.min(1, rel / innerW));
    setHover(1 + Math.round(f * 101));
  };

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)} data-testid="spectral-tray">
      {!candidate ? (
        <div className="grid h-full place-items-center text-[11px] text-haze" style={{ height }}>
          Select a candidate to inspect its 102-band spectrum.
        </div>
      ) : (
        <>
          <svg
            width={w}
            height={height}
            role="img"
            aria-label={`Spectral plot for candidate ${candidate.id}, epoch ${epoch} against epoch 1 baseline`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            className="block"
          >
            <g aria-hidden="true">
              {markers.map((tick) => {
                const band = 1 + (tick / 101) * 101;
                return (
                  <g key={tick}>
                    <line x1={x(band)} y1={pad.t} x2={x(band)} y2={pad.t + innerH} stroke="rgba(148,163,184,0.12)" />
                    <text
                      x={x(band)}
                      y={height - 5}
                      fill="var(--haze)"
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {(0.75 + (tick / 101) * 4.25).toFixed(1)}
                    </text>
                  </g>
                );
              })}
              <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="var(--line-2)" />
              <text x={pad.l - 4} y={pad.t + 4} fill="var(--haze)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
                mJy
              </text>
              <text x={pad.l + innerW} y={pad.t + 4} fill="var(--haze)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
                µm
              </text>
            </g>

            {SPECTRAL_DIAGNOSTICS.map((d, i) => {
              const bx = x(bandAtWavelength(d.um));
              return (
                <g key={d.label} aria-hidden="true">
                  <line
                    x1={bx}
                    y1={pad.t}
                    x2={bx}
                    y2={pad.t + innerH}
                    stroke="rgba(148,163,184,0.35)"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={bx + 2}
                    y={compact ? 9 + (i % 2) * 9 : 10 + (i % 2) * 10}
                    fill="var(--haze)"
                    fontSize={compact ? 7.5 : 8.5}
                    fontFamily="var(--font-mono)"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}

            <path d={baselinePath} fill="none" stroke="var(--haze)" strokeWidth="1" strokeDasharray="4 3" />
            <path d={activePath} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
            <path
              d={`${activePath} L${x(102)},${y(min)} L${x(1)},${y(min)} Z`}
              fill="var(--accent)"
              opacity="0.06"
            />

            {active && (
              <g aria-hidden="true">
                <line
                  x1={x(active.band)}
                  y1={pad.t}
                  x2={x(active.band)}
                  y2={pad.t + innerH}
                  stroke="var(--accent)"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <circle cx={x(active.band)} cy={y(active.flux)} r="2.6" fill="var(--accent)" />
                <circle cx={x(active.band)} cy={y(active.baseline)} r="2" fill="none" stroke="var(--haze)" />
              </g>
            )}
          </svg>

          {active && (
            <div
              className="pointer-events-none absolute z-10 border border-line bg-panel px-2 py-1.5 font-mono text-[9px] leading-relaxed text-mist shadow-none"
              style={{
                left: Math.min(Math.max(6, x(active.band) - 80), w - 176),
                top: 2,
              }}
            >
              <div className="text-ink">
                {bandLabel(active.band)} · {active.wavelength.toFixed(3)} µm
              </div>
              <div>
                LVF {bandLabel(active.band)} · {active.flux.toFixed(3)} mJy
              </div>
              <div className={active.delta >= 0 ? 'text-accent' : 'text-signal'}>
                Δ {active.delta >= 0 ? '+' : '−'}
                {Math.abs(active.delta).toFixed(3)} mJy
              </div>
            </div>
          )}

          {!compact && (
            <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-3 font-mono text-[8px] text-haze">
              <span className="flex items-center gap-1">
                <span className="h-px w-4 bg-accent" /> E{epoch}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-px w-4 border-t border-dashed border-haze" /> E1 baseline
              </span>
            </div>
          )}

          <span className="sr-only">
            Hovered band {active ? bandLabel(active.band) : 'none'}, wavelength{' '}
            {active ? bandWavelength(active.band).toFixed(3) : '0'} micrometres.
          </span>
        </>
      )}
    </div>
  );
}
