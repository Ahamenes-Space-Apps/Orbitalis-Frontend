import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, PanelRightClose, Sparkles } from 'lucide-react';
import { formatArcsec, formatDec, formatRa, padId } from '@/lib/coords';
import {
  candidateCategory,
  candidateDesignation,
  candidateTitle,
  deltaMagAt,
  formatDeltaMag,
  formatMjd,
  epochMjd,
} from '@/lib/epochs';
import { useCandidate, useExplanation, useField, useRankedCandidates } from '@/data/hooks';
import { useAssistant } from '@/store/useAssistant';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';
import { PhotometryCurve } from '@/components/charts/PhotometryCurve';
import { TemporalCutouts } from '@/components/charts/TemporalCutouts';
import { SpectralTray } from '@/components/charts/SpectralTray';

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 border border-line bg-canvas px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-[0.1em] text-haze">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[13px] tabular-nums text-ink">{value}</div>
      <div className="truncate text-[8px] text-haze">{sub}</div>
    </div>
  );
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2 border-b border-line pb-1">
      <h2 className="m-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">{children}</h2>
      {aside}
    </div>
  );
}

export function DossierPanel({
  candidateId,
  variant = 'panel',
}: {
  candidateId: number | null;
  variant?: 'panel' | 'full';
}) {
  const field = useField();
  const detail = useCandidate(candidateId);
  const explanation = useExplanation(candidateId);
  const { ranked } = useRankedCandidates({ applyFilters: false });
  const epoch = useUi((s) => s.epoch);
  const select = useUi((s) => s.select);
  const toggleDossier = useUi((s) => s.toggleDossier);
  const send = useAssistant((s) => s.send);
  const setAssistantOpen = useAssistant((s) => s.setOpen);
  const [followUp, setFollowUp] = useState('');

  const candidate = detail.data ?? null;
  const rankedCandidate = ranked.find((c) => c.id === candidateId);
  const score = rankedCandidate?.score ?? 0;
  const rank = rankedCandidate?.rank;

  if (candidateId === null) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-[11px] text-haze">
        Select a candidate to open its investigation dossier.
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div role="alert" className="p-4 text-[11px] text-signal">
        Could not load candidate #{padId(candidateId)}.
      </div>
    );
  }

  if (!candidate) {
    return <div className="p-4 text-[11px] text-haze">Loading candidate #{padId(candidateId)}…</div>;
  }

  const pos = candidate.positions[0];
  const moving = candidate.cls === 'moving';
  const f = field.data;

  const ask = (event: FormEvent) => {
    event.preventDefault();
    const text = followUp.trim();
    if (!text) return;
    void send(
      text,
      [
        ...(f ? [{ kind: 'field' as const, id: f.id, label: f.name }] : []),
        { kind: 'candidate' as const, id: String(candidate.id), label: `Candidate #${padId(candidate.id)}` },
        { kind: 'frame' as const, id: String(epoch), label: `Epoch ${epoch} of ${f?.epochs.length ?? 6}` },
      ],
      {
        fieldName: f?.name ?? null,
        synthetic: f?.synthetic ?? false,
        candidate: {
          id: candidate.id,
          rank: rank ?? 0,
          score,
          cls: candidate.cls,
          displacementArcsec: candidate.displacementArcsec,
          rateArcsecPerYear: candidate.rateArcsecPerYear,
          detections: candidate.detections,
          knownObject: candidate.knownMatch?.object ?? null,
        },
      },
    );
    setAssistantOpen(true);
    setFollowUp('');
  };

  return (
    <div className={cn('flex min-h-0 flex-col', variant === 'panel' ? 'h-full' : 'w-full')}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">Investigation Dossier</span>
          <span className="font-mono text-[9px] tabular-nums text-accent">{candidateDesignation(candidate.id)}</span>
        </div>
        <div className="flex items-center gap-1">
          {variant === 'panel' ? (
            <>
              <Link
                to={`/candidates/${candidate.id}`}
                className="flex items-center gap-1 px-1.5 py-1 text-[9px] text-haze no-underline transition-colors hover:text-ink"
              >
                Full view
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={toggleDossier}
                aria-label="Hide dossier"
                className="grid size-6 cursor-pointer place-items-center text-haze transition-colors hover:text-ink"
              >
                <PanelRightClose className="size-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <select
                value={candidate.id}
                onChange={(e) => select(Number(e.target.value))}
                aria-label="Switch candidate"
                className="h-6 border border-line bg-canvas px-1 font-mono text-[9px] tabular-nums text-ink outline-none focus:border-accent"
              >
                {ranked.map((c) => (
                  <option key={c.id} value={c.id}>
                    {candidateDesignation(c.id)} · {c.cls}
                  </option>
                ))}
              </select>
              <Link to="/" className="px-1.5 py-1 text-[9px] text-haze no-underline transition-colors hover:text-ink">
                Back to sky
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="console-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="m-0 text-[19px] font-semibold leading-tight text-ink">Candidate #{padId(candidate.id)}</h1>
          <span className="font-mono text-[22px] font-medium tabular-nums text-accent">{score.toFixed(2)}</span>
        </div>
        <p className="m-0 mt-0.5 text-[11px] text-mist">{candidateTitle(candidate)}</p>
        <p className="m-0 mt-1 font-mono text-[9px] tabular-nums text-haze">
          J2000 · RA {formatRa(pos.ra)} · Dec {formatDec(pos.dec)}
        </p>
        <p className="m-0 mt-1 font-mono text-[9px] tabular-nums text-haze">
          {candidateCategory(candidate)} · {candidate.detections} epochs · {formatArcsec(candidate.displacementArcsec, 1)} ·{' '}
          {formatDeltaMag(deltaMagAt(epoch, candidate))}
          {rank ? ` · rank ${rank}` : ''}
        </p>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <Metric
            label="Displacement"
            value={formatArcsec(candidate.displacementArcsec)}
            sub={moving ? `epoch 1 → ${candidate.positions.length}` : 'consistent with no motion'}
          />
          <Metric
            label="Flux Var"
            value={formatDeltaMag(deltaMagAt(epoch, candidate))}
            sub={`${candidate.fluxChangePct >= 0 ? '+' : '−'}${Math.abs(candidate.fluxChangePct).toFixed(1)}% total`}
          />
          <Metric
            label="Motion Conf"
            value={candidate.motionConfidence === null ? 'n/a' : `${Math.round(candidate.motionConfidence * 100)}%`}
            sub={moving ? 'straight-line fit' : 'no track fit'}
          />
          <Metric
            label="Proper Rate"
            value={`${candidate.rateArcsecPerYear.toFixed(1)}″/yr`}
            sub={`±${candidate.positionSigmaArcsec.toFixed(2)}″ position σ`}
          />
        </div>

        <div className="mt-3">
          <SectionTitle aside={<span className="font-mono text-[8px] tabular-nums text-haze">MJD {formatMjd(epochMjd(f, epoch))}</span>}>
            Photometric Δmag · 6 epochs
          </SectionTitle>
          <PhotometryCurve candidate={candidate} epoch={epoch} />
        </div>

        <div className="mt-3">
          <SectionTitle aside={<span className="font-mono text-[8px] text-haze">120″ × 120″</span>}>
            Temporal Difference Cutout
          </SectionTitle>
          <TemporalCutouts candidate={candidate} epochs={f?.epochs ?? []} epoch={epoch} />
          <p className="m-0 mt-1.5 text-[8px] leading-relaxed text-haze">
            Stationary field stars cancel in the residual. Moving or flaring candidates leave a marked residual.
          </p>
        </div>

        <div className="mt-3">
          <SectionTitle>102-Band Spectrum</SectionTitle>
          <SpectralTray candidate={candidate} epoch={epoch} height={92} compact />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[8px] tabular-nums text-haze">
            <span>Anomaly S {candidate.components.S.toFixed(2)}</span>
            <span>
              {candidate.flaggedBands
                ? `Flagged B${String(candidate.flaggedBands[0]).padStart(3, '0')}–B${String(candidate.flaggedBands[1]).padStart(3, '0')}`
                : 'No flagged bands'}
            </span>
            <span>Peak {candidate.peakDepartureSigma.toFixed(1)}σ</span>
          </div>
        </div>

        <div className="mt-3 border border-line bg-canvas p-2.5">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <SectionTitle>AI Scientific Triage</SectionTitle>
            <button
              type="button"
              onClick={() => void explanation.refetch()}
              disabled={explanation.isFetching}
              className="flex shrink-0 cursor-pointer items-center gap-1 border border-line-2 px-2 py-1 text-[9px] text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <Sparkles className="size-3 text-accent" aria-hidden="true" />
              {explanation.isFetching ? 'Analyzing…' : 'Analyze Candidate'}
            </button>
          </div>

          {explanation.isLoading && <p className="m-0 text-[10px] text-haze">Writing the cautious interpretation…</p>}
          {explanation.isError && (
            <p className="m-0 text-[10px] text-signal" role="alert">
              The summary could not be generated. The measurements above are unaffected.
            </p>
          )}
          {explanation.data && (
            <div className="flex flex-col gap-1.5">
              {explanation.data.text.split('\n\n').map((para, i) => (
                <p key={i} className="m-0 text-[10px] leading-relaxed text-mist">
                  {para}
                </p>
              ))}
              <p className="m-0 border-t border-line pt-1.5 text-[9px] leading-relaxed text-haze">
                {explanation.data.caveat} Source: {explanation.data.generatedBy}.
              </p>
            </div>
          )}

          <form onSubmit={ask} className="mt-2 flex gap-1">
            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a follow-up about this candidate"
              aria-label="Follow-up question"
              className="h-7 min-w-0 flex-1 border border-line bg-panel px-2 text-[10px] text-ink outline-none placeholder:text-haze focus:border-accent"
            />
            <button
              type="submit"
              disabled={!followUp.trim()}
              className="h-7 shrink-0 cursor-pointer border border-line-2 px-2 text-[9px] text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>

        {variant === 'full' && (
          <>
            <div className="mt-3">
              <SectionTitle>Catalog Cross-Match</SectionTitle>
              <ul className="m-0 flex list-none flex-col p-0">
                {candidate.crossMatches.map((k) => (
                  <li key={k.catalog} className="flex items-baseline justify-between gap-2 border-b border-line py-1 last:border-b-0">
                    <span className="text-[10px] text-mist">{k.catalog}</span>
                    <span className={cn('font-mono text-[9px] tabular-nums', k.matched ? 'text-signal' : 'text-haze')}>
                      {k.matched ? (k.detail ?? 'match') : 'no match'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-1 text-[8px] leading-relaxed text-haze">
                A catalog non-match is not proof of novelty. Catalogs are incomplete at faint magnitudes.
              </p>
            </div>

            <div className="mt-3">
              <SectionTitle>Epoch Positions</SectionTitle>
              <table className="w-full border-collapse font-mono text-[9px] tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-haze">
                    <th className="py-1 pr-2 font-medium">EPOCH</th>
                    <th className="py-1 pr-2 font-medium">DAY</th>
                    <th className="py-1 pr-2 text-right font-medium">ΔRA·cosδ</th>
                    <th className="py-1 text-right font-medium">ΔDec</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.offsetsArcsec.map((o, i) => (
                    <tr key={i} className="border-b border-line/70 text-mist last:border-b-0">
                      <td className="py-1 pr-2 text-ink">E{i + 1}</td>
                      <td className="py-1 pr-2">{f?.epochs[i]?.daysSinceFirst ?? '—'}</td>
                      <td className="py-1 pr-2 text-right">{o.dx.toFixed(2)}″</td>
                      <td className="py-1 text-right">{o.dy.toFixed(2)}″</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
