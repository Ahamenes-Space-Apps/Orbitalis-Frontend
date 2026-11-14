import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Crosshair, Minus, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import { buildSkyItems } from '@/lib/skyItems';
import {
  deltaMagAt,
  epochForField,
  epochMjd,
  epochPosition,
  formatDeltaMag,
  formatMjd,
  formatUtcDate,
  mjdToDate,
} from '@/lib/epochs';
import { formatDec, formatRa, padId } from '@/lib/coords';
import { useUi } from '@/store/useUi';
import type { CandidateSummary, FieldInfo, StationarySource } from '@/data/types';
import { SvgSky } from './SvgSky';
import { EpochDock } from './EpochDock';
import type { SkyHandle } from './types';

const AladinSky = lazy(() => import('./AladinSky').then((m) => ({ default: m.AladinSky })));

const iconBtn =
  'grid size-8 cursor-pointer place-items-center border border-[#1e466b] bg-[#0d0d0d]/95 text-[#94a3b8] transition-colors hover:border-[#67baf4] hover:text-[#fafafa]';

function HudRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="w-11 shrink-0 text-[8px] uppercase tracking-[0.12em] text-[#64748b]">{label}</span>
      <span className="font-mono text-[10px] tabular-nums text-[#fafafa]">{value}</span>
    </div>
  );
}

export function SkyView({
  field,
  stationary,
  candidates,
}: {
  field: FieldInfo;
  stationary: StationarySource[];
  candidates: CandidateSummary[];
}) {
  const epoch = useUi((s) => s.epoch);
  const gain = useUi((s) => s.motionGain);
  const trails = useUi((s) => s.trails);
  const selectedId = useUi((s) => s.selectedId);
  const layers = useUi((s) => s.layers);
  const renderer = useUi((s) => s.renderer);
  const tempMode = useUi((s) => s.tempMode);
  const showGrid = useUi((s) => s.showGrid);
  const showConstellations = useUi((s) => s.showConstellations);
  const showAnchorStars = useUi((s) => s.showAnchorStars);
  const dossierOpen = useUi((s) => s.dossierOpen);
  const { select, toggleDossier, setRenderer } = useUi.getState();

  const [aladinFailure, setAladinFailure] = useState<string | null>(null);
  const handle = useRef<SkyHandle>(null);

  const items = useMemo(
    () =>
      buildSkyItems({
        stationary,
        candidates,
        epoch,
        gain,
        trails,
        selectedId,
        layers,
        tempMode,
        showAnchorStars,
      }),
    [stationary, candidates, epoch, gain, trails, selectedId, layers, tempMode, showAnchorStars],
  );

  const useAladin = renderer !== 'svg' && aladinFailure === null;
  const onFailed = useCallback((reason: string) => setAladinFailure(reason), []);
  const onSelect = useCallback((id: number) => select(id), [select]);

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const current = epochForField(field, epoch);
  const pos = selected ? epochPosition(selected.positions, epoch) : field.center;
  const mjd = epochMjd(field, epoch);
  const dm = selected ? deltaMagAt(epoch, selected) : 0;

  return (
    <div className="absolute inset-0">
      {useAladin ? (
        <Suspense
          fallback={<div className="absolute inset-0 grid place-items-center text-[11px] text-haze">Loading WebGL sky…</div>}
        >
          <AladinSky
            key="aladin"
            field={field}
            items={items}
            onSelect={onSelect}
            onFailed={onFailed}
            showGrid={showGrid}
            showConstellations={showConstellations}
            ref={handle}
          />
        </Suspense>
      ) : (
        <SvgSky
          key="svg"
          field={field}
          items={items}
          onSelect={onSelect}
          showGrid={showGrid}
          showConstellations={showConstellations}
          ref={handle}
        />
      )}

      <div className="pointer-events-none absolute top-3 left-3 z-10">
        <div className="pointer-events-auto min-w-[236px] border border-[#1e466b]/80 bg-[#0d0d0d]/95 px-2.5 py-2">
          <div className="mb-1.5 flex items-baseline justify-between gap-4 border-b border-[#1e466b]/50 pb-1.5">
            <span className="font-mono text-[9px] tabular-nums text-[#67baf4]">
              EPOCH {epoch} / {field.epochs.length}
            </span>
            <span className="font-mono text-[9px] tabular-nums text-[#94a3b8]">{current?.offsetLabel}</span>
          </div>
          <div className="flex flex-col gap-1">
            <HudRow label="MJD" value={formatMjd(mjd)} />
            <HudRow label="UTC" value={formatUtcDate(mjdToDate(mjd))} />
            <HudRow label="Target" value={selected ? `#${padId(selected.id)}` : 'FIELD'} />
            <HudRow label="RA" value={formatRa(pos.ra)} />
            <HudRow label="Dec" value={formatDec(pos.dec)} />
            <HudRow label="Δm" value={selected ? formatDeltaMag(dm) : '—'} />
          </div>
          <div className="mt-1.5 border-t border-[#1e466b]/50 pt-1 font-mono text-[8px] tabular-nums text-[#64748b]">
            motion ×{gain} · {tempMode === 'tempdiff' ? 'temporal difference' : tempMode}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={toggleDossier}
          className="flex h-8 cursor-pointer items-center gap-1.5 border border-[#1e466b] bg-[#0d0d0d]/95 px-2.5 text-[10px] font-medium text-[#fafafa] transition-colors hover:border-[#67baf4]"
        >
          {dossierOpen ? <PanelRightClose className="size-3.5" aria-hidden="true" /> : <PanelRightOpen className="size-3.5" aria-hidden="true" />}
          {dossierOpen ? 'Hide Dossier' : 'Inspect Dossier'}
        </button>

        <div className="flex flex-col gap-1">
          <button type="button" aria-label="Zoom in" className={iconBtn} onClick={() => handle.current?.zoomIn()}>
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Zoom out" className={iconBtn} onClick={() => handle.current?.zoomOut()}>
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Center on selected candidate"
            className={iconBtn}
            onClick={() => handle.current?.centerOn(selected ? selected.positions[0] : null)}
          >
            <Crosshair className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex border border-[#1e466b] bg-[#0d0d0d]/95" role="group" aria-label="Sky renderer">
          <button
            type="button"
            onClick={() => {
              setAladinFailure(null);
              setRenderer('aladin');
            }}
            aria-pressed={useAladin}
            className={`cursor-pointer px-2 py-1 text-[9px] ${useAladin ? 'bg-[#1e466b] text-[#fafafa]' : 'text-[#94a3b8] hover:text-[#fafafa]'}`}
          >
            WebGL
          </button>
          <button
            type="button"
            onClick={() => setRenderer('svg')}
            aria-pressed={!useAladin}
            className={`cursor-pointer px-2 py-1 text-[9px] ${!useAladin ? 'bg-[#1e466b] text-[#fafafa]' : 'text-[#94a3b8] hover:text-[#fafafa]'}`}
          >
            SVG
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 justify-center">
        <EpochDock field={field} onResetView={() => handle.current?.centerOn(null)} />
      </div>

      {aladinFailure && (
        <div
          role="status"
          className="absolute right-3 bottom-3 z-10 max-w-[260px] border border-[#1e466b] bg-[#0d0d0d]/95 px-2 py-1.5 text-[9px] leading-relaxed text-[#94a3b8]"
        >
          WebGL sky unavailable ({aladinFailure}). Showing the SVG renderer.
        </div>
      )}
    </div>
  );
}
