import { useState } from 'react';
import { cn } from '@/lib/utils';

const TABS = ['Pipeline', 'Scoring model', 'Validation', 'Limitations'] as const;
type Tab = (typeof TABS)[number];

const STAGES = [
  ['01', 'Ingest', 'Fetch the SPHEREx image series, preserve original frames, and record provenance.'],
  ['02', 'Prepare', 'Apply WCS alignment, image-quality flags, and the configured stacking policy.'],
  ['03', 'Compare', 'Difference aligned epochs and suppress stationary field structure.'],
  ['04', 'Extract', 'Measure connected residuals, positions, uncertainties, and 102-band flux.'],
  ['05', 'Score', 'Combine motion, brightness, spectral, and temporal evidence into priority S.'],
  ['06', 'Review', 'Present candidates for human inspection. A score is not a discovery claim.'],
] as const;

const TOOLS = [
  ['Interface', 'React + TypeScript', 'Typed state and predictable rendering for dense scientific controls.'],
  ['Styling', 'Tailwind CSS v4 tokens', 'One semantic palette keeps dark and light modes consistent.'],
  ['Server state', 'TanStack Query', 'Caching, retries, and explicit loading/error states for API data.'],
  ['Client state', 'Zustand', 'Small persistent UI state for epoch, selection, layers, and theme.'],
  ['Sky renderer', 'SVG + optional Aladin Lite', 'SVG is deterministic and testable; Aladin adds real-sky context.'],
  ['Charts', 'SVG + uPlot', 'Lightweight interaction without a charting framework.'],
] as const;

const VALIDATION = [
  ['Recall', '0.91', 'Recovered injected sources'],
  ['Precision', '0.88', 'Measured against injected sources'],
  ['Completeness', '0.84', 'For this experiment'],
] as const;

const LIMITATIONS = [
  'Real detections that match nothing known remain candidates, not errors.',
  'Real shifts may be smaller than a pixel. Displayed motion can be exaggerated and must be labelled.',
  'Spectral classification depends on available bands and calibration quality.',
  'A catalog non-match is not proof of novelty; catalogs are incomplete at faint magnitudes.',
  'Human review of original observations is required before any interpretation.',
] as const;

function Row({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="grid gap-1 border-b border-line py-2 last:border-b-0 sm:grid-cols-[140px_1fr]">
      <span className="text-[9px] uppercase tracking-[0.1em] text-haze">{label}</span>
      <div className="min-w-0">
        <div className="font-mono text-[11px] tabular-nums text-ink">{value}</div>
        <p className="m-0 mt-0.5 text-[10px] leading-relaxed text-mist">{note}</p>
      </div>
    </div>
  );
}

export function ArchitecturePage() {
  const [tab, setTab] = useState<Tab>('Pipeline');

  return (
    <div className="console-scroll min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">SYSTEM ARCHITECTURE</div>
            <h1 className="m-0 mt-0.5 text-[17px] font-semibold text-ink">ORBITALIS · SPHEREx candidate review</h1>
            <p className="m-0 mt-0.5 text-[10px] text-haze">
              How the search works, how the score is built, and where the method can fail.
            </p>
          </div>
          <span className="border border-line-2 px-2 py-1 font-mono text-[9px] tabular-nums text-haze">
            QR2 · synthetic validation field
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
          <nav aria-label="Architecture sections" className="flex gap-1 overflow-x-auto lg:h-fit lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-current={tab === t ? 'page' : undefined}
                className={cn(
                  'shrink-0 cursor-pointer border border-transparent px-2.5 py-1.5 text-left text-[10px] transition-colors',
                  tab === t ? 'border-line-2 bg-panel text-ink' : 'text-haze hover:text-ink',
                )}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="min-w-0 border border-line bg-panel p-3">
            {tab === 'Pipeline' && (
              <div className="grid gap-4">
                <div>
                  <h2 className="m-0 text-[11px] font-semibold text-ink">Six-stage review pipeline</h2>
                  <p className="m-0 mt-1 max-w-[720px] text-[10px] leading-relaxed text-mist">
                    Each stage keeps the evidence that came before it. A combined or annotated product never replaces
                    the original observation.
                  </p>
                </div>
                <ol className="m-0 grid list-none gap-0 p-0">
                  {STAGES.map(([n, name, text], i) => (
                    <li
                      key={n}
                      className={cn(
                        'grid grid-cols-[34px_minmax(0,1fr)] gap-2 py-2',
                        i < STAGES.length - 1 && 'border-b border-line',
                      )}
                    >
                      <span className="pt-0.5 font-mono text-[10px] tabular-nums text-accent">{n}</span>
                      <div>
                        <div className="text-[10px] font-medium text-ink">{name}</div>
                        <p className="m-0 mt-0.5 text-[10px] leading-relaxed text-mist">{text}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div>
                  <h2 className="m-0 mb-1 text-[11px] font-semibold text-ink">Tool rationale</h2>
                  <table className="w-full border-collapse font-mono text-[9px] tabular-nums">
                    <thead>
                      <tr className="border-b border-line text-left text-haze">
                        <th className="py-1 pr-2 font-medium">LAYER</th>
                        <th className="py-1 pr-2 font-medium">CHOICE</th>
                        <th className="py-1 font-medium">WHY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TOOLS.map(([layer, choice, why]) => (
                        <tr key={layer} className="border-b border-line/60 align-top last:border-b-0">
                          <td className="py-1 pr-2 text-ink">{layer}</td>
                          <td className="py-1 pr-2 text-accent">{choice}</td>
                          <td className="py-1 font-sans text-[10px] leading-relaxed text-mist">{why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'Scoring model' && (
              <div className="grid gap-3">
                <div>
                  <h2 className="m-0 text-[11px] font-semibold text-ink">Priority score</h2>
                  <p className="m-0 mt-1 text-[18px] font-mono text-accent">S = wM·M + wB·B + wS·S + wT·T</p>
                  <p className="m-0 mt-1 max-w-[720px] text-[10px] leading-relaxed text-mist">
                    Four normalised components are combined with user-adjustable weights. A known-object match applies
                    a damping factor; it does not erase the candidate.
                  </p>
                </div>
                <div>
                  <Row label="M · motion" value="Straight-line fit quality" note="Consistency of the measured track across epochs." />
                  <Row label="B · brightness" value="Variability significance" note="Flux change relative to the measured noise." />
                  <Row label="S · spectral" value="Band-to-band anomaly" note="Departure from the field median across 102 LVF bands." />
                  <Row label="T · temporal" value="Persistence of residual" note="Whether the signal persists through the epoch series." />
                  <Row label="Known object" value="× 0.35" note="Applied when a catalog cross-match is found. Illustrative value." />
                </div>
                <p className="m-0 border-t border-line pt-2 text-[9px] leading-relaxed text-haze">
                  The score is a ranking aid, not a calibrated probability. Weights are visible and adjustable in the
                  candidate rail.
                </p>
              </div>
            )}

            {tab === 'Validation' && (
              <div className="grid gap-3">
                <div>
                  <h2 className="m-0 text-[11px] font-semibold text-ink">Validation experiment</h2>
                  <p className="m-0 mt-1 text-[10px] leading-relaxed text-mist">
                    Synthetic sources are injected with known positions and brightness. Metrics apply only to the
                    selected experiment.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {VALIDATION.map(([label, value, note]) => (
                    <div key={label} className="border border-line bg-canvas p-2.5">
                      <div className="text-[9px] uppercase tracking-[0.1em] text-haze">{label}</div>
                      <div className="mt-1 font-mono text-[24px] leading-none tabular-nums text-ink">{value}</div>
                      <div className="mt-1 text-[9px] leading-relaxed text-mist">{note}</div>
                    </div>
                  ))}
                </div>
                <div className="border border-line bg-canvas p-2.5">
                  <h3 className="m-0 text-[10px] font-semibold text-ink">Model card · cnn-0.1</h3>
                  <p className="m-0 mt-1 text-[10px] leading-relaxed text-mist">
                    <b className="text-ink">Intended use:</b> prioritise candidates for human inspection. The model is
                    trained on synthetic sources and does not confirm an object or provide calibrated confidence.
                  </p>
                  <p className="m-0 mt-1.5 text-[9px] leading-relaxed text-haze">
                    These are illustrative prototype values, not a live validation run. Re-run validation on the target
                    survey before publication.
                  </p>
                </div>
              </div>
            )}

            {tab === 'Limitations' && (
              <div className="grid gap-3">
                <div>
                  <h2 className="m-0 text-[11px] font-semibold text-ink">What this system cannot tell you</h2>
                  <p className="m-0 mt-1 text-[10px] leading-relaxed text-mist">
                    Candidate review is an evidence-gathering workflow. It does not establish discovery.
                  </p>
                </div>
                <ul className="m-0 flex list-none flex-col gap-0 p-0">
                  {LIMITATIONS.map((l) => (
                    <li key={l} className="border-b border-line py-2 text-[10px] leading-relaxed text-mist last:border-b-0">
                      {l}
                    </li>
                  ))}
                </ul>
                <p className="m-0 text-[9px] leading-relaxed text-haze">
                  Any real-world claim requires independent follow-up observations and review of the original frames.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
