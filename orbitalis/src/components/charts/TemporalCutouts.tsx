import type { CandidateDetail, Epoch } from '@/data/types';
import { epochOffset, formatDeltaMag, deltaMagAt } from '@/lib/epochs';

const SIZE = 120;

function Stamp({
  label,
  sub,
  stars,
  candidate,
  baseline,
  residual,
}: {
  label: string;
  sub: string;
  stars: { dx: number; dy: number; mag: number }[];
  candidate: { dx: number; dy: number } | null;
  baseline?: { dx: number; dy: number } | null;
  residual?: boolean;
}) {
  return (
    <figure className="m-0 flex min-w-0 flex-1 flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium text-ink">{label}</span>
        <span className="font-mono text-[8px] tabular-nums text-haze">{sub}</span>
      </figcaption>
      <svg
        viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${label} ${SIZE} by ${SIZE} arcsecond cutout`}
        className="aspect-square w-full border border-line bg-[#0d0d0d]"
      >
        <g aria-hidden="true">
          <line x1={-SIZE / 2} y1={0} x2={SIZE / 2} y2={0} stroke="rgba(103,186,244,0.12)" />
          <line x1={0} y1={-SIZE / 2} x2={0} y2={SIZE / 2} stroke="rgba(103,186,244,0.12)" />
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.dx}
              cy={-s.dy}
              r={0.5 + s.mag * 0.9}
              fill="#cfe0ff"
              opacity={residual ? 0.08 : 0.35 + s.mag * 0.45}
            />
          ))}

          {baseline && residual && (
            <circle
              cx={baseline.dx}
              cy={-baseline.dy}
              r={3}
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {candidate && (
            <>
              <circle
                cx={candidate.dx}
                cy={-candidate.dy}
                r={residual ? 4 : 3}
                fill="none"
                stroke={residual ? '#f59e0b' : '#67baf4'}
                strokeWidth="1.3"
              />
              <circle cx={candidate.dx} cy={-candidate.dy} r={1} fill={residual ? '#f59e0b' : '#67baf4'} />
            </>
          )}

          {residual && baseline && candidate && (
            <line
              x1={baseline.dx}
              y1={-baseline.dy}
              x2={candidate.dx}
              y2={-candidate.dy}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
          )}
        </g>
      </svg>
    </figure>
  );
}

export function TemporalCutouts({
  candidate,
  epochs,
  epoch,
}: {
  candidate: CandidateDetail;
  epochs: Epoch[];
  epoch: number;
}) {
  const first = epochOffset(candidate.offsetsArcsec, 1);
  const active = epochOffset(candidate.offsetsArcsec, epoch);
  const mid = { dx: (first.dx + active.dx) / 2, dy: (first.dy + active.dy) / 2 };
  const rel = (p: { dx: number; dy: number }) => ({ dx: p.dx - mid.dx, dy: p.dy - mid.dy });
  const activeLabel = epochs.find((e) => e.id === epoch)?.offsetLabel ?? `E${epoch}`;

  return (
    <div className="flex gap-2">
      <Stamp
        label="E1 Reference"
        sub="baseline"
        stars={candidate.cutout.stars}
        candidate={rel(first)}
      />
      <Stamp
        label="Active Epoch Obs"
        sub={activeLabel}
        stars={candidate.cutout.stars}
        candidate={rel(active)}
        baseline={rel(first)}
      />
      <Stamp
        label="Residual"
        sub={formatDeltaMag(deltaMagAt(epoch, candidate))}
        stars={candidate.cutout.stars}
        candidate={rel(active)}
        baseline={rel(first)}
        residual
      />
    </div>
  );
}
