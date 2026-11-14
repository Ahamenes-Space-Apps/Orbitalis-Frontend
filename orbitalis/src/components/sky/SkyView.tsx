import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { buildSkyItems } from "@/lib/skyItems";
import { useUi, type LayerVisibility } from "@/store/useUi";
import type {
  CandidateSummary,
  FieldInfo,
  StationarySource,
} from "@/data/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SvgSky } from "./SvgSky";
import { TimelinePanel } from "./TimelinePanel";
import type { SkyHandle } from "./types";
import { BandStrip } from "./BandStrip";

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

  const counts = {
    stationary: stationary.length,
    moving: candidates.filter((c) => c.cls === "moving").length,
    variable: candidates.filter((c) => c.cls === "variable").length,
  };

  const layerChips: {
    key: keyof LayerVisibility;
    label: string;
    swatch: string;
  }[] = [
    {
      key: "stationary",
      label: `Stationary ${counts.stationary}`,
      swatch: "size-[7px] rounded-full bg-star",
    },
    {
      key: "moving",
      label: `Moving ${counts.moving}`,
      swatch: "size-3 rounded-full border-[1.5px] border-accent",
    },
    {
      key: "variable",
      label: `Variable ${counts.variable}`,
      swatch: "size-3 rounded-full border-[1.5px] border-dashed border-accent-2",
    },
  ];

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

      <div className="pointer-events-none absolute top-4 right-5 left-5 flex flex-wrap items-start justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="pointer-events-auto flex max-w-full flex-col items-start gap-2.5"
        >
        <div className="flex flex-col gap-3">
  <div
    className="flex flex-wrap items-center gap-2"
    role="group"
    aria-label="Layers"
  >
    {layerChips.map((c) => (
      <Button
        key={c.key}
        variant="pill"
        size="sm"
        data-active={layers[c.key]}
        aria-pressed={layers[c.key]}
        onClick={() => toggleLayer(c.key)}
        className="data-[active=true]:border-ink/70 data-[active=true]:bg-ink/25 data-[active=true]:text-field"
      >
        <span aria-hidden="true" className={c.swatch} />
        {c.label}
      </Button>
    ))}
    <Button
      variant="pill"
      size="sm"
      data-active={trails}
      aria-pressed={trails}
      onClick={() => setTrails(!trails)}
      className="data-[active=true]:border-ink/70 data-[active=true]:bg-ink/25 data-[active=true]:text-field"
    >
      Trails
    </Button>
  </div>

  <div className="bg-bar/90 px-[22px] py-4 backdrop-blur-md">
    <BandStrip />
  </div>
</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line-2 bg-bar/90 px-3 py-1.5 text-xs text-mist">
            <span>
              Motion exaggerated ×{gain} so it is visible. Real shifts are
              sub-pixel.
            </span>
            <span className="flex w-36 items-center">
              <Slider
                thumbLabel="Motion exaggeration"
                min={1}
                max={50}
                step={1}
                value={[gain]}
                onValueChange={(v) => setMotionGain(v[0])}
              />
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
          {aladinFailure && (
            <div
              role="status"
              className="max-w-md rounded-lg border border-accent/40 bg-bar/95 px-3 py-2 text-xs text-mist"
            >
              Aladin Lite could not start ({aladinFailure}). Showing the
              built-in sky view instead.
            </div>
          )}
        </motion.div>

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
