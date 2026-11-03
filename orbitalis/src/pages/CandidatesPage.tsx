import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatArcsec, formatSigned, padId } from '@/lib/coords';
import { DURATION, EASE } from '@/lib/motion';
import { COMPONENT_META, KNOWN_OBJECT_FACTOR, normalizeWeights } from '@/lib/scoring';
import { useRankedCandidates } from '@/data/hooks';
import { useUi, type ClassFilter } from '@/store/useUi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CandidatesPage() {
  const { visible, ranked, isLoading, isError } = useRankedCandidates();
  const weights = useUi((s) => s.weights);
  const setWeights = useUi((s) => s.setWeights);
  const resetWeights = useUi((s) => s.resetWeights);
  const classFilter = useUi((s) => s.classFilter);
  const setClassFilter = useUi((s) => s.setClassFilter);
  const hideKnown = useUi((s) => s.hideKnown);
  const setHideKnown = useUi((s) => s.setHideKnown);
  const select = useUi((s) => s.select);
  const nw = normalizeWeights(weights);
  const allZero = weights.M + weights.B + weights.S + weights.T === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-6 pt-7 pb-14">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-[0.14em] text-amber">CANDIDATES</div>
        <h1 className="m-0 text-4xl font-semibold">Rank by what matters to you</h1>
        <p className="m-0 max-w-3xl text-[15px] leading-relaxed text-mist">
          The score is a weighted sum of four pieces of evidence. The weights are yours to change, and the list re-ranks as you move them.
          A candidate that matches a known object keeps its place in the list but its score is multiplied by {KNOWN_OBJECT_FACTOR}.
        </p>
      </div>

      <section className="flex flex-wrap items-stretch gap-5">
        <Card className="min-w-[320px] flex-[1_1_420px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Score weights</CardTitle>
              <CardDescription>S = wM·M + wB·B + wS·S + wT·T, normalised to sum to 1.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetWeights}>Reset</Button>
          </div>
          <div className="flex flex-col gap-4">
            {COMPONENT_META.map((m) => (
              <div key={m.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label className="text-sm font-medium" id={`w-${m.key}`}>
                    <span aria-hidden="true" className="mr-2 inline-block size-2.5 rounded-xs align-middle" style={{ background: m.color }} />
                    {m.name} ({m.key})
                  </label>
                  <span className="font-mono text-sm" data-testid={`weight-${m.key}`}>{Math.round(nw[m.key] * 100)}%</span>
                </div>
                <Slider
                  thumbLabel={`Weight for ${m.name}`}
                  min={0}
                  max={100}
                  step={1}
                  value={[Math.round(weights[m.key] * 100)]}
                  onValueChange={(v) => setWeights({ ...weights, [m.key]: v[0] / 100 })}
                />
              </div>
            ))}
          </div>
          {allZero && <p className="m-0 text-xs text-amber" role="status">All weights are zero, so the defaults are used.</p>}
        </Card>

        <Card className="min-w-[320px] flex-[1_1_360px]">
          <CardTitle>Filters</CardTitle>
          <Tabs value={classFilter} onValueChange={(v) => setClassFilter(v as ClassFilter)}>
            <TabsList aria-label="Filter by class">
              <TabsTrigger value="all">All {ranked.length}</TabsTrigger>
              <TabsTrigger value="moving">Moving {ranked.filter((c) => c.cls === 'moving').length}</TabsTrigger>
              <TabsTrigger value="variable">Variable {ranked.filter((c) => c.cls === 'variable').length}</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="flex items-center justify-between gap-3 text-sm text-mist">
            Hide known objects
            <Switch checked={hideKnown} onCheckedChange={setHideKnown} aria-label="Hide known objects" />
          </label>
          <p className="m-0 text-xs leading-normal text-haze">
            Showing {visible.length} of {ranked.length}. In a real field, most movers are known asteroids, so this filter matters.
          </p>
        </Card>
      </section>

      <Card className="gap-3 overflow-hidden p-0 sm:p-0">
        {isLoading && <div role="status" className="p-6 text-sm text-haze">Loading candidates…</div>}
        {isError && <div role="alert" className="p-6 text-sm text-amber">Could not load candidates.</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <caption className="sr-only">Candidates ranked by score</caption>
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-widest text-haze">
                <th scope="col" className="px-4 py-3 font-medium">RANK</th>
                <th scope="col" className="px-4 py-3 font-medium">CANDIDATE</th>
                <th scope="col" className="px-4 py-3 font-medium">CLASS</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">DISPLACEMENT</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">FLUX Δ</th>
                {COMPONENT_META.map((m) => (
                  <th key={m.key} scope="col" className="px-3 py-3 text-right font-medium">{m.key}</th>
                ))}
                <th scope="col" className="px-4 py-3 text-right font-medium">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b border-[#1b2438] hover:bg-panel-2" data-testid="candidate-row">
                  <td className="px-4 py-3 font-mono text-haze">{c.rank}</td>
                  <td className="px-4 py-3">
                    <Link to={`/candidates/${c.id}`} onClick={() => select(c.id)} className="font-semibold no-underline hover:underline">
                      #{padId(c.id)}
                    </Link>
                    {c.knownMatch && <Badge tone="quiet" className="ml-2 px-2 py-0.5 text-[11px]">Known object</Badge>}
                  </td>
                  <td className="px-4 py-3" style={{ color: c.cls === 'moving' ? '#F2B544' : '#A596FF' }}>{c.cls === 'moving' ? 'Moving' : 'Variable'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatArcsec(c.displacementArcsec)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatSigned(c.fluxChangePct)}</td>
                  {COMPONENT_META.map((m) => (
                    <td key={m.key} className="px-3 py-3 text-right font-mono text-mist">{c.components[m.key].toFixed(2)}</td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono font-medium text-amber">{c.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && visible.length === 0 && <div className="p-6 text-sm text-haze">No candidates match these filters.</div>}
      </Card>
    </div>
  );
}
