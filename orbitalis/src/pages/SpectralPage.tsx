import { useMemo } from 'react';
import { useCandidate, useField, useRankedCandidates } from '@/data/hooks';
import { useUi } from '@/store/useUi';
import type { EpochId } from '@/data/types';
import {
  EPOCH_IDS,
  LVF_BANDS,
  bandLabel,
  candidateDesignation,
  formatDeltaMag,
  deltaMagAt,
  spectrumPoints,
} from '@/lib/epochs';
import { SpectralTray } from '@/components/charts/SpectralTray';
import { cn } from '@/lib/utils';

export function SpectralPage() {
  const field = useField();
  const selectedId = useUi((s) => s.selectedId);
  const select = useUi((s) => s.select);
  const epoch = useUi((s) => s.epoch);
  const setEpoch = useUi((s) => s.setEpoch);
  const detail = useCandidate(selectedId);
  const { ranked } = useRankedCandidates({ applyFilters: false });
  const candidate = detail.data ?? null;

  const points = useMemo(() => (candidate ? spectrumPoints(candidate, epoch) : []), [candidate, epoch]);
  const peak = points.reduce((acc, p) => Math.max(acc, Math.abs(p.flux)), 0);

  return (
    <div className="console-scroll min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">SPECTRAL EXPLORER</div>
            <h1 className="m-0 mt-0.5 text-[17px] font-semibold text-ink">
              {candidate ? candidateDesignation(candidate.id) : 'No candidate selected'}
            </h1>
            <p className="m-0 mt-0.5 font-mono text-[9px] tabular-nums text-haze">
              102 LVF bands · 0.75–5.00 µm · active epoch E{epoch} ·{' '}
              {candidate ? formatDeltaMag(deltaMagAt(epoch, candidate)) : '—'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[9px] text-haze">
              Target
              <select
                value={selectedId ?? ''}
                onChange={(e) => select(Number(e.target.value))}
                className="h-7 border border-line bg-panel px-1.5 font-mono text-[10px] tabular-nums text-ink outline-none focus:border-accent"
              >
                {ranked.map((c) => (
                  <option key={c.id} value={c.id}>
                    {candidateDesignation(c.id)} · {c.cls}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex border border-line" role="group" aria-label="Epoch selector">
              {EPOCH_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEpoch(id as EpochId)}
                  aria-pressed={epoch === id}
                  className={cn(
                    'shrink-0 cursor-pointer px-2.5 py-1 font-mono text-[10px] tabular-nums transition-colors',
                    epoch === id ? 'bg-accent text-canvas' : 'text-haze hover:text-ink',
                  )}
                >
                  E{id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">Full-Band Spectrum</span>
            <span className="font-mono text-[8px] tabular-nums text-haze">
              peak {peak.toFixed(3)} mJy · {field.data?.epochs.length ?? 6} epochs
            </span>
          </div>
          <SpectralTray candidate={candidate} epoch={epoch} height={300} />
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">
                Sampled Channel Comparison · B001–B102
              </span>
              <span className="font-mono text-[8px] tabular-nums text-haze">active vs E1 baseline</span>
            </div>
            <div className="console-scroll max-h-[420px] overflow-auto">
              <table className="w-full border-collapse font-mono text-[9px] tabular-nums">
                <thead className="sticky top-0 bg-panel">
                  <tr className="border-b border-line text-left text-haze">
                    <th className="px-2 py-1.5 font-medium">CHANNEL</th>
                    <th className="px-2 py-1.5 text-right font-medium">λ µm</th>
                    <th className="px-2 py-1.5 text-right font-medium">ACTIVE mJy</th>
                    <th className="px-2 py-1.5 text-right font-medium">E1 mJy</th>
                    <th className="px-2 py-1.5 text-right font-medium">Δ mJy</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.band} className="border-b border-line/60 text-mist last:border-b-0 hover:bg-panel-2">
                      <td className="px-2 py-1 text-ink">{bandLabel(p.band)}</td>
                      <td className="px-2 py-1 text-right">{p.wavelength.toFixed(3)}</td>
                      <td className="px-2 py-1 text-right">{p.flux.toFixed(3)}</td>
                      <td className="px-2 py-1 text-right text-haze">{p.baseline.toFixed(3)}</td>
                      <td className={cn('px-2 py-1 text-right', p.delta >= 0 ? 'text-accent' : 'text-signal')}>
                        {p.delta >= 0 ? '+' : '−'}
                        {Math.abs(p.delta).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="h-fit border border-line bg-panel">
            <div className="border-b border-line px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">
                LVF Bands 1–6 · Resolving Power
              </span>
            </div>
            <table className="w-full border-collapse font-mono text-[9px] tabular-nums">
              <thead>
                <tr className="border-b border-line text-left text-haze">
                  <th className="px-2 py-1.5 font-medium">LVF</th>
                  <th className="px-2 py-1.5 font-medium">µm</th>
                  <th className="px-2 py-1.5 text-right font-medium">R</th>
                  <th className="px-2 py-1.5 font-medium">FEATURE</th>
                </tr>
              </thead>
              <tbody>
                {LVF_BANDS.map((b) => (
                  <tr key={b.band} className="border-b border-line/60 text-mist last:border-b-0">
                    <td className="px-2 py-1 text-ink">B{b.band}</td>
                    <td className="px-2 py-1">{b.range}</td>
                    <td className="px-2 py-1 text-right text-accent">{b.r}</td>
                    <td className="px-2 py-1 text-haze">{b.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="m-0 border-t border-line px-2 py-1.5 text-[8px] leading-relaxed text-haze">
              Resolving-power values are illustrative for this prototype and must be replaced with the instrument
              calibration before publication.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
