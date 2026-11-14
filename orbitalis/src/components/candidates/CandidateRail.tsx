import { useMemo, useState } from 'react';
import { ChevronLeft, Download, Search } from 'lucide-react';
import { formatArcsec, padId } from '@/lib/coords';
import {
  candidateCategory,
  candidateDesignation,
  candidateTitle,
  finalDeltaMag,
  formatDeltaMag,
} from '@/lib/epochs';
import { useCandidate, useField, useRankedCandidates } from '@/data/hooks';
import { useUi } from '@/store/useUi';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'moving', label: 'Moving' },
  { key: 'flux', label: 'Flux Δ' },
  { key: 'top', label: 'Top' },
] as const;

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function LayerToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap py-1 text-[10px] text-mist">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export function CandidateRail() {
  const { ranked, visible: filtered, isLoading, isError } = useRankedCandidates();
  const field = useField();
  const selectedId = useUi((s) => s.selectedId);
  const select = useUi((s) => s.select);
  const trails = useUi((s) => s.trails);
  const setTrails = useUi((s) => s.setTrails);
  const showGrid = useUi((s) => s.showGrid);
  const setShowGrid = useUi((s) => s.setShowGrid);
  const showConstellations = useUi((s) => s.showConstellations);
  const setShowConstellations = useUi((s) => s.setShowConstellations);
  const showAnchorStars = useUi((s) => s.showAnchorStars);
  const setShowAnchorStars = useUi((s) => s.setShowAnchorStars);
  const toggleRail = useUi((s) => s.toggleRail);
  const detail = useCandidate(selectedId);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [minScore, setMinScore] = useState(0);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = filtered.filter((c) => c.score * 100 >= minScore);
    if (q) {
      items = items.filter(
        (c) =>
          String(c.id).includes(q) ||
          candidateDesignation(c.id).toLowerCase().includes(q) ||
          candidateTitle(c).toLowerCase().includes(q),
      );
    }
    if (filter === 'moving') items = items.filter((c) => c.cls === 'moving');
    if (filter === 'top') items = items.slice(0, 10);
    if (filter === 'flux') items = [...items].sort((a, b) => Math.abs(b.fluxChangePct) - Math.abs(a.fluxChangePct));
    return items;
  }, [filtered, query, filter, minScore]);

  const exportDossier = () => {
    const selected = ranked.find((c) => c.id === selectedId);
    downloadJson(`ORBITALIS-candidate-${padId(selectedId ?? 0)}.json`, {
      exportedAt: new Date().toISOString(),
      field: field.data ?? null,
      candidate: detail.data ?? selected ?? null,
      selection: selectedId,
    });
  };

  return (
    <aside className="flex h-full w-[328px] shrink-0 flex-col border-r border-line bg-panel max-lg:fixed max-lg:inset-y-[52px] max-lg:left-0 max-lg:z-30 max-lg:shadow-none">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <h1 className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Candidate Detection</h1>
          <span className="font-mono text-[9px] tabular-nums text-haze">{ranked.length}</span>
        </div>
        <button
          type="button"
          onClick={toggleRail}
          aria-label="Collapse candidate rail"
          className="grid size-6 cursor-pointer place-items-center text-haze transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-haze" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidate ID or title"
            aria-label="Search candidates"
            className="h-7 w-full border border-line bg-canvas pl-7 pr-2 text-[11px] text-ink outline-none placeholder:text-haze focus:border-accent"
          />
        </label>

        <div className="mt-2 flex overflow-x-auto border border-line" role="group" aria-label="Candidate filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                'shrink-0 cursor-pointer whitespace-nowrap px-2.5 py-1 text-[10px] transition-colors',
                filter === f.key ? 'bg-accent text-canvas' : 'text-haze hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-2.5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-[0.1em] text-haze">Min priority score</span>
            <span className="font-mono text-[10px] tabular-nums text-ink">{minScore}</span>
          </div>
          <Slider
            thumbLabel="Minimum priority score"
            min={0}
            max={95}
            step={1}
            value={[minScore]}
            onValueChange={(v) => setMinScore(v[0])}
            className="h-4"
          />
        </div>
      </div>

      <div className="console-scroll min-h-0 flex-1 overflow-y-auto">
        {isLoading && <div className="px-3 py-4 text-[11px] text-haze">Loading candidates…</div>}
        {isError && (
          <div role="alert" className="px-3 py-4 text-[11px] text-signal">
            Could not load candidates.
          </div>
        )}

        <ol className="m-0 flex list-none flex-col p-0" aria-label="Ranked candidates">
          {list.map((c) => {
            const selected = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full cursor-pointer flex-col gap-1 border-b border-line px-3 py-2 text-left transition-colors',
                    selected ? 'bg-accent/10' : 'hover:bg-panel-2',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-mono text-[9px] tabular-nums text-haze">{String(c.rank).padStart(2, '0')}</span>
                      <span className={cn('truncate font-mono text-[11px] tabular-nums', selected ? 'text-accent' : 'text-ink')}>
                        {candidateDesignation(c.id)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-ink">{c.score.toFixed(2)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[10px] text-mist">{candidateTitle(c)}</span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-haze">
                      {c.detections} ep
                    </span>
                  </div>
                  <div className="truncate font-mono text-[9px] tabular-nums text-haze">
                    {candidateCategory(c)} · {formatArcsec(c.displacementArcsec, 1)} · {formatDeltaMag(finalDeltaMag(c))}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        {!isLoading && list.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-haze">No candidates match these filters.</div>
        )}
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.1em] text-haze">Sky layers</span>
          <span className="font-mono text-[8px] text-haze">{list.length} shown</span>
        </div>
        <LayerToggle label="Motion Trails" checked={trails} onChange={setTrails} />
        <LayerToggle label="RA/Dec Grid" checked={showGrid} onChange={setShowGrid} />
        <LayerToggle label="Constellations" checked={showConstellations} onChange={setShowConstellations} />
        <LayerToggle label="Anchor Stars" checked={showAnchorStars} onChange={setShowAnchorStars} />
        <button
          type="button"
          onClick={exportDossier}
          disabled={selectedId === null}
          className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 border border-line-2 bg-transparent text-[10px] font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="size-3" aria-hidden="true" />
          Export Candidate Dossier JSON
        </button>
      </div>
    </aside>
  );
}
