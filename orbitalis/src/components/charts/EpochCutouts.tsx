import type { CandidateDetail, Epoch } from '@/data/types';
import { palette } from '@/lib/palette';

/**
 * One square cutout per epoch, drawn to scale. The stars are fixed; the ring is the candidate;
 * the dashed ring marks where the candidate was at epoch 1.
 * East is left and north is up, as on the sky.
 */
export function EpochCutouts({ candidate, epochs }: { candidate: CandidateDetail; epochs: Epoch[] }) {
  const h = candidate.cutout.halfWidthArcsec;
  const o = candidate.offsetsArcsec;
  const first = o[0];
  const last = o[o.length - 1];
  const mid = { dx: (first.dx + last.dx) / 2, dy: (first.dy + last.dy) / 2 };
  const unit = h / 30; // keeps star and ring sizes comparable when the cutout is wider
  const ringR = 3.5 * unit;
  const at = (p: { dx: number; dy: number }) => ({ x: -(p.dx - mid.dx), y: p.dy - mid.dy });

  return (
    <div className="flex flex-wrap gap-4">
      {epochs.map((e, k) => {
        const p = at(o[Math.min(k, o.length - 1)]);
        const g = at(first);
        return (
          <figure key={e.id} className="m-0 flex max-w-55 min-w-[170px] flex-1 flex-col gap-2.5">
            <svg
              viewBox={`${-h} ${-h} ${2 * h} ${2 * h}`}
              role="img"
              aria-label={`${e.label}, ${2 * h} arcsecond cutout`}
              className="aspect-square w-full rounded-[10px] border border-line-2 bg-field"
            >
              {candidate.cutout.stars.map((s, i) => (
                <circle key={i} cx={-s.dx} cy={-s.dy} r={(0.45 + s.mag * 1.1) * unit} fill={palette.star} opacity={0.4 + s.mag * 0.5} />
              ))}
              {k > 0 && (
                <circle cx={g.x} cy={-g.y} r={ringR} fill="none" stroke={palette.haze} strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              )}
              <circle cx={p.x} cy={-p.y} r={ringR} fill="none" stroke={palette.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <circle cx={p.x} cy={-p.y} r={0.5 * unit} fill={palette.accent} />
            </svg>
            <figcaption className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{e.label}</span>
              <span className="font-mono text-xs text-haze">{e.offsetLabel}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
