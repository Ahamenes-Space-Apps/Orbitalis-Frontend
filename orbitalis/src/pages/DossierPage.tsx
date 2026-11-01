import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { formatArcsec, formatDec, formatRa, formatSigned, padId } from '@/lib/coords';
import { contributions, normalizeWeights, KNOWN_OBJECT_FACTOR } from '@/lib/scoring';
import { useCandidate, useExplanation, useField, useRankedCandidates } from '@/data/hooks';
import { useUi } from '@/store/useUi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EpochCutouts } from '@/components/charts/EpochCutouts';
import { MotionPlot } from '@/components/charts/MotionPlot';
import { SpectrumChart } from '@/components/charts/SpectrumChart';
import { NotFoundPage } from './NotFoundPage';
import { ApiError } from '@/data/api';

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-[220px] flex-1 rounded-2xl border border-line bg-panel px-5 py-[18px]">
      <div className="text-[11px] tracking-widest text-haze">{label}</div>
      <div className="mt-2 font-mono text-[32px] leading-tight">{value}</div>
      <div className="mt-1 text-[13px] text-mist">{sub}</div>
    </div>
  );
}

export function DossierPage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id);

  const select = useUi((s) => s.select);
  const weights = useUi((s) => s.weights);
  const bandRange = useUi((s) => s.bandRange);
  const detail = useCandidate(valid ? id : null);
  const explanation = useExplanation(valid ? id : null);
  const field = useField();
  const { ranked } = useRankedCandidates({ applyFilters: false });

  useEffect(() => {
    if (valid) select(id);
  }, [id, valid, select]);

  if (!valid) return <NotFoundPage what="candidate" />;
  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <NotFoundPage what={`candidate #${padId(id)}`} />
    ) : (
      <div role="alert" className="p-10 text-amber">
        Could not load candidate #{padId(id)}.
      </div>
    );
  }
  if (!detail.data || !field.data) {
    return (
      <div role="status" className="p-10 text-haze">
        Loading candidate #{padId(id)}…
      </div>
    );
  }

  const c = detail.data;
  const f = field.data;
  const scored = ranked.find((r) => r.id === c.id);
  const score = scored?.score ?? 0;
  const rank = scored?.rank;
  const parts = contributions(c.components, weights);
  const nw = normalizeWeights(weights);
  const px = c.displacementArcsec / f.pixelScaleArcsec;
  const pos = c.positions[0];
  const moving = c.cls === 'moving';
  const overlap =
    bandRange && c.flaggedBands && c.flaggedBands[0] <= bandRange[1] && c.flaggedBands[1] >= bandRange[0];

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-6 pt-7 pb-14">
      <Link to="/" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sky explorer
      </Link>

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="text-xs font-semibold tracking-[0.14em] text-amber">CANDIDATE DOSSIER</div>
          <h1 className="m-0 text-[46px] leading-[1.05] font-semibold">Candidate #{padId(c.id)}</h1>
          <div className="font-mono text-[13px] text-haze">
            RA {formatRa(pos.ra)} · Dec {formatDec(pos.dec)} · field {f.id}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={moving ? 'amber' : 'violet'}>{moving ? 'Moving candidate' : 'Variable candidate'}</Badge>
            <Badge>{c.knownMatch ? 'Known object match' : 'No catalog match'}</Badge>
            <Badge>{c.detections} epochs</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] tracking-widest text-haze">PRIORITY SCORE S</div>
            <div className="font-mono text-[60px] leading-none font-medium text-amber" data-testid="score">
              {score.toFixed(2)}
            </div>
            {rank && <div className="font-mono text-xs text-haze">rank {rank} of {ranked.length}</div>}
          </div>
          {c.motionConfidence !== null && (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] tracking-widest text-haze">MOTION CONFIDENCE</div>
              <div className="font-mono text-[32px] leading-tight">{Math.round(c.motionConfidence * 100)}%</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2.5">
            <Button size="default">Flag for follow-up</Button>
            <Button variant="outline">Export report</Button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-line-2 bg-panel-2 px-[18px] py-3.5">
        <Info className="mt-px size-5 shrink-0 text-amber" aria-hidden="true" />
        <p className="m-0 text-sm leading-relaxed text-[#cbd3e4]">
          This object shows behavior that <strong className="text-ink">warrants investigation</strong>. It is a candidate, not a confirmed
          detection. Independent follow-up observations are needed before any claim is made.
        </p>
      </div>

      <section className="flex flex-wrap gap-4" aria-label="Key numbers">
        <Stat
          label="DISPLACEMENT"
          value={formatArcsec(c.displacementArcsec)}
          sub={moving ? `≈ ${px.toFixed(1)} pixel${px >= 1.05 ? 's' : ''} · epoch 1 to ${f.epochs.length}` : 'consistent with no motion'}
        />
        <Stat label="BRIGHTNESS CHANGE" value={formatSigned(c.fluxChangePct)} sub={c.variabilitySigma !== null ? `${c.variabilitySigma.toFixed(1)}σ variability` : 'not significant on its own'} />
        <Stat label="DETECTIONS" value={`${c.detections} of ${f.epochs.length}`} sub={moving ? 'fits a straight-line track' : 'position stays within error'} />
        <Stat label="CATALOG MATCH" value={c.knownMatch ? 'Match' : 'None'} sub={c.knownMatch ? c.knownMatch.object : 'within 10″ in 4 catalogs'} />
      </section>

      <section className="flex flex-wrap items-stretch gap-5">
        <Card className="min-w-[320px] flex-[1_1_640px]">
          <div>
            <CardTitle>Epoch cutouts</CardTitle>
            <CardDescription>
              {2 * c.cutout.halfWidthArcsec}″ × {2 * c.cutout.halfWidthArcsec}″ around the source. The shift is drawn to scale; the dashed ring marks where it was at epoch 1.
            </CardDescription>
          </div>
          <EpochCutouts candidate={c} epochs={f.epochs} />
        </Card>
        <Card className="min-w-[320px] flex-[1_1_480px]">
          <div>
            <CardTitle>Sky-plane motion</CardTitle>
            <CardDescription>Offset from epoch 1 in arcseconds. Dashed circles are the 1σ position error ({c.positionSigmaArcsec.toFixed(2)}″).</CardDescription>
          </div>
          <MotionPlot offsets={c.offsetsArcsec} sigma={c.positionSigmaArcsec} />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-mist">
            <span>Rate: ≈ {c.rateArcsecPerYear.toFixed(1)}″ per year</span>
            <span>Epochs: {f.epochs.map((e) => e.offsetLabel).join(', ')}</span>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <CardTitle>Spectrum across 102 bands</CardTitle>
            <CardDescription>0.75–5.0 µm, relative flux in arbitrary units against the field median.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#cbd3e4]">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-xs bg-slate" />Candidate #{padId(c.id)}</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-3.5 bg-ink" />Field median</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-xs bg-amber" />{c.flaggedBands ? `Flagged bands ${c.flaggedBands[0]}–${c.flaggedBands[1]}` : 'No flagged bands'}</span>
            {bandRange && <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-xs border border-dashed border-violet" />Your range {bandRange[0]}–{bandRange[1]}</span>}
          </div>
        </div>
        <SpectrumChart spectrum={c.spectrum} median={c.medianSpectrum} flagged={c.flaggedBands} bandRange={bandRange} />
        <div className="flex flex-wrap gap-x-10 gap-y-3 pt-1">
          <div><div className="text-[11px] tracking-widest text-haze">SPECTRAL ANOMALY S</div><div className="mt-1 font-mono text-[22px]">{c.components.S.toFixed(2)}</div></div>
          <div><div className="text-[11px] tracking-widest text-haze">FLAGGED WIDTH</div><div className="mt-1 font-mono text-[22px]">{c.flaggedBands ? `${c.flaggedBands[1] - c.flaggedBands[0] + 1} bands` : 'none'}</div></div>
          <div><div className="text-[11px] tracking-widest text-haze">PEAK DEPARTURE</div><div className="mt-1 font-mono text-[22px]">{c.peakDepartureSigma.toFixed(1)}σ</div></div>
          {bandRange && <div><div className="text-[11px] tracking-widest text-haze">YOUR BAND RANGE</div><div className="mt-1 font-mono text-[22px]">{overlap ? 'overlaps flagged' : 'no overlap'}</div></div>}
        </div>
      </Card>

      <section className="flex flex-wrap items-stretch gap-5">
        <Card className="min-w-[320px] flex-[1_1_420px]">
          <div>
            <CardTitle>Evidence breakdown</CardTitle>
            <CardDescription>S = wM·M + wB·B + wS·S + wT·T. Change the weights on the Candidates page.</CardDescription>
          </div>
          <div className="flex flex-col gap-3.5">
            {parts.map((p) => (
              <div key={p.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{p.name} ({p.key})</span>
                  <span className="font-mono text-xs text-haze">w {p.weight.toFixed(2)} · +{p.contribution.toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-[#1a2338]"><div className="h-2 rounded-full" style={{ width: `${Math.round(p.value * 100)}%`, background: p.color }} /></div>
                  <span className="w-10 text-right font-mono text-sm">{p.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-mist">Where the score comes from</span>
              <span className="font-mono text-sm">S = {score.toFixed(2)}</span>
            </div>
            <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-md bg-[#1a2338]">
              {parts.map((p) => (
                <div key={p.key} className="h-3" style={{ width: `${(p.contribution * 100).toFixed(1)}%`, background: p.color }} />
              ))}
            </div>
            {c.knownMatch && (
              <p className="m-0 text-xs text-haze">Multiplied by {KNOWN_OBJECT_FACTOR} because it matches a known object.</p>
            )}
            <p className="m-0 text-xs text-haze">
              Normalised weights: M {nw.M.toFixed(2)}, B {nw.B.toFixed(2)}, S {nw.S.toFixed(2)}, T {nw.T.toFixed(2)}.
            </p>
          </div>
        </Card>

        <Card className="min-w-[320px] flex-[1_1_420px]">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Why it was prioritized</CardTitle>
            <Badge tone="quiet" className="text-xs">AI-written summary</Badge>
          </div>
          {explanation.isLoading && <p className="m-0 text-sm text-haze" role="status">Writing the summary…</p>}
          {explanation.isError && <p className="m-0 text-sm text-amber" role="alert">The summary could not be generated. The numbers on this page are unaffected.</p>}
          {explanation.data && (
            <>
              {explanation.data.text.split('\n\n').map((para, i) => (
                <p key={i} className="m-0 text-[15px] leading-relaxed text-[#d5dbe8]">{para}</p>
              ))}
              <div className="mt-auto rounded-[10px] bg-panel-2 px-3.5 py-3 text-xs leading-normal text-mist">
                {explanation.data.caveat} <span className="text-haze">Source: {explanation.data.generatedBy}.</span>
              </div>
            </>
          )}
        </Card>

        <Card className="min-w-[300px] flex-[1_1_340px]">
          <CardTitle>Known-object cross-match</CardTitle>
          <ul className="m-0 flex list-none flex-col p-0">
            {c.crossMatches.map((k) => (
              <li key={k.catalog} className="flex items-center justify-between gap-3 border-b border-[#1e2840] py-3 last:border-b-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{k.catalog}</span>
                  <span className="text-xs text-haze">{k.kind}</span>
                </div>
                <span className={`font-mono text-xs ${k.matched ? 'text-amber' : 'text-[#cbd3e4]'}`}>
                  {k.matched ? (k.detail ?? 'match') : 'no match < 10″'}
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-auto text-xs leading-normal text-mist">No match is not proof of novelty. Catalogs are incomplete at faint magnitudes.</p>
        </Card>
      </section>
    </div>
  );
}
