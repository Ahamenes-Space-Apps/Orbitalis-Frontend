import { PanelLeftOpen } from 'lucide-react';
import { useCandidate, useCandidates, useField, useStationary } from '@/data/hooks';
import { SkyView } from '@/components/sky/SkyView';
import { CandidateRail } from '@/components/candidates/CandidateRail';
import { DossierPanel } from '@/components/candidates/DossierPanel';
import { SpectralTray } from '@/components/charts/SpectralTray';
import { useUi } from '@/store/useUi';
import { candidateDesignation, bandLabel } from '@/lib/epochs';
import { cn } from '@/lib/utils';

export function ExplorerPage() {
  const field = useField();
  const stationary = useStationary();
  const candidates = useCandidates();
  const railOpen = useUi((s) => s.railOpen);
  const toggleRail = useUi((s) => s.toggleRail);
  const dossierOpen = useUi((s) => s.dossierOpen);
  const selectedId = useUi((s) => s.selectedId);
  const epoch = useUi((s) => s.epoch);
  const detail = useCandidate(selectedId);

  const failed = field.isError || stationary.isError || candidates.isError;
  const ready = field.data && stationary.data && candidates.data;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-canvas">
      {railOpen && <CandidateRail />}

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {!railOpen && (
          <button
            type="button"
            onClick={toggleRail}
            aria-label="Open candidate rail"
            className="absolute top-3 left-3 z-20 flex h-8 cursor-pointer items-center gap-1.5 border border-line bg-panel px-2 text-[10px] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <PanelLeftOpen className="size-3.5" aria-hidden="true" />
            Candidates
          </button>
        )}

        <div className="relative min-h-0 flex-1">
          {failed && (
            <div role="alert" className="absolute inset-0 grid place-items-center p-8 text-center text-[11px] text-signal">
              The sky data could not be loaded. If you set VITE_API_URL, check that the backend is running.
            </div>
          )}
          {!failed && !ready && (
            <div role="status" className="absolute inset-0 grid place-items-center text-[11px] text-haze">
              Loading the sky…
            </div>
          )}
          {ready && (
            <SkyView field={field.data!} stationary={stationary.data!} candidates={candidates.data!} />
          )}
        </div>

        <div className="h-[142px] shrink-0 border-t border-line bg-panel">
          <div className="flex h-7 items-center justify-between gap-2 border-b border-line px-3">
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-haze">Spectral Explorer Tray</span>
              <span className="font-mono text-[9px] tabular-nums text-ink">
                {selectedId === null ? 'no target' : candidateDesignation(selectedId)}
              </span>
            </div>
            <div className="flex items-baseline gap-3 font-mono text-[8px] tabular-nums text-haze">
              <span>{bandLabel(1)}–{bandLabel(102)}</span>
              <span>0.75–5.00 µm</span>
              <span>ACTIVE E{epoch}</span>
            </div>
          </div>
          <SpectralTray candidate={detail.data ?? null} epoch={epoch} height={114} />
        </div>

        {!dossierOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[150px] flex justify-center">
            <span className="border border-[#1e466b] bg-[#0d0d0d]/95 px-2 py-1 text-[9px] text-[#94a3b8]">
              Dossier hidden · use Inspect Dossier to reopen
            </span>
          </div>
        )}
      </section>

      <aside
        className={cn(
          'w-[356px] shrink-0 border-l border-line bg-panel',
          dossierOpen
            ? 'flex max-xl:fixed max-xl:inset-y-[52px] max-xl:right-0 max-xl:z-30 max-xl:w-[min(356px,100vw)]'
            : 'hidden',
        )}
      >
        {dossierOpen && <DossierPanel candidateId={selectedId} />}
      </aside>
    </div>
  );
}
