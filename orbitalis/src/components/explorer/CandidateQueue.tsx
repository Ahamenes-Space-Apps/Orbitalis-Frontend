import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CandidateSummary, RankBasis } from '@/data/types';
import { formatId, formatRate } from '@/lib/format';
import { useUi } from '@/store/useUi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'moving';

interface CandidateQueueProps {
  candidates: CandidateSummary[];
  selectedId: string | null;
  basis: RankBasis;
  modelVersion: string | null;
  loading: boolean;
  error: unknown;
  canSearch: boolean;
  onSelect: (candidateId: string) => void;
  onHover: (candidateId: string | null) => void;
  onRunSearch: () => void;
}

export function CandidateQueue({
  candidates,
  selectedId,
  basis,
  modelVersion,
  loading,
  error,
  canSearch,
  onSelect,
  onHover,
  onRunSearch,
}: CandidateQueueProps) {
  const collapsed = useUi((state) => state.queueCollapsed);
  const toggleQueue = useUi((state) => state.toggleQueue);
  const sortBy = useUi((state) => state.sortBy);
  const setSortBy = useUi((state) => state.setSortBy);
  const hoveredId = useUi((state) => state.hoveredCandidateId);
  const [filter, setFilter] = useState<Filter>('all');

  const ordered = [...candidates]
    .filter((candidate) => filter === 'all' || (!candidate.static_source && candidate.candidate_id !== null))
    .sort((a, b) => {
    if (sortBy === 'rate') {
      return (
        Math.hypot(b.motion.mu_e_arcsec_per_day, b.motion.mu_n_arcsec_per_day) -
        Math.hypot(a.motion.mu_e_arcsec_per_day, a.motion.mu_n_arcsec_per_day)
      );
    }
    if (sortBy === 'ordinal') return (a.ordinal ?? 0) - (b.ordinal ?? 0);
    return 0;
  });

  const movingCount = candidates.filter((candidate) => !candidate.static_source).length;
  const subtitle =
    basis === 'model_score'
      ? `Ranked by model score${modelVersion ? ` (${modelVersion})` : ''}. Unconfirmed.`
      : 'Ranked by stack SNR. Unconfirmed.';

  return (
    <section
      aria-label="Candidate queue"
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
    >
      <div className={cn('flex items-center gap-2 border-b border-line p-3', collapsed && 'justify-center')}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1">
            <div className="flex items-center gap-2">
              <h2 className="m-0 truncate text-lg font-semibold text-white">Candidates</h2>
              <Badge tone="amber" className="px-2 py-0.5 text-[10px]">
                Unconfirmed
              </Badge>
            </div>
            <p className="m-0 text-[11px] leading-snug text-haze" data-testid="queue-subtitle">
              {subtitle}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleQueue}
          aria-label={collapsed ? 'Expand candidate queue' : 'Collapse candidate queue'}
          aria-expanded={!collapsed}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-panel-2"
        >
          {collapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter candidates">
            <Button
              variant="pill"
              size="sm"
              data-active={filter === 'all'}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All {candidates.length}
            </Button>
            <Button
              variant="pill"
              size="sm"
              data-active={filter === 'moving'}
              aria-pressed={filter === 'moving'}
              onClick={() => setFilter('moving')}
            >
              Moving {movingCount}
            </Button>
          </div>

          <label className="flex items-center justify-between gap-2 px-1 text-[11px] text-haze">
            Sort
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="min-h-8 rounded-md border border-line-2 bg-bar px-2 text-[11px] text-mist"
              aria-label="Sort candidates"
            >
              <option value="rank">Rank</option>
              <option value="rate">Rate</option>
              <option value="ordinal">Ordinal</option>
            </select>
          </label>

          {loading && <p className="m-0 px-1 text-sm text-haze">Loading candidates…</p>}
          {Boolean(error) && <p className="m-0 px-1 text-sm text-[#ff9d9d]">Candidates could not be loaded.</p>}

          {!loading && !error && candidates.length === 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3">
              <p className="m-0 text-[13px] leading-snug text-mist">
                No search has been run for this field.
              </p>
              <Button size="sm" onClick={onRunSearch} disabled={!canSearch}>
                Run moving-object search
              </Button>
              {!canSearch && (
                <p className="m-0 text-[11px] text-haze">Wait for the field to finish loading before searching.</p>
              )}
            </div>
          )}

          {!loading && !error && candidates.length > 0 && (
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Ranked candidates">
              {ordered.map((candidate, index) => {
                const selected = candidate.candidate_id === selectedId;
                const hovered = candidate.candidate_id === hoveredId;
                const rate = Math.hypot(
                  candidate.motion.mu_e_arcsec_per_day,
                  candidate.motion.mu_n_arcsec_per_day,
                );
                return (
                  <li key={candidate.candidate_id}>
                    <button
                      type="button"
                      onClick={() => onSelect(candidate.candidate_id)}
                      onMouseEnter={() => onHover(candidate.candidate_id)}
                      onMouseLeave={() => onHover(null)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2.5 border px-2.5 py-2.5 text-left text-inherit transition-colors',
                        selected
                          ? 'border-[#3b4c78] bg-[#17203a]'
                          : hovered
                            ? 'border-line-2 bg-panel-2'
                            : 'border-[#1b2438] bg-transparent hover:bg-panel',
                      )}
                    >
                      <span className="w-4 shrink-0 font-mono text-[11px] text-haze">
                        {sortBy === 'rank' ? index + 1 : (candidate.ordinal ?? index + 1)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[14px] font-semibold text-white">
                            {formatId(candidate.ordinal)}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: candidate.static_source ? '#9aa3b8' : '#feb832' }}
                          >
                            {candidate.static_source ? 'Static flag' : 'Moving'}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-haze">
                          {formatRate(rate)}
                          {basis === 'stack_snr' && ` · SNR ${candidate.stack_snr.toFixed(1)}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-[12px] font-medium text-white">
                        {basis === 'model_score' && candidate.model_score
                          ? candidate.model_score.value.toFixed(2)
                          : candidate.stack_snr.toFixed(1)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="m-0 mt-auto px-1 text-[10px] leading-snug text-haze">
            Stack SNR is signal-to-noise of the combined image at this position along this path. It is
            not a detection claim.
          </p>
        </div>
      )}
    </section>
  );
}
