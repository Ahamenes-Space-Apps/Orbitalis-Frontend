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

// Aladin Lite is big, so it is only fetched when the sky view is shown.
const AladinSky = lazy(() =>
  import("./AladinSky").then((m) => ({ default: m.AladinSky })),
);

const iconBtn =
  "flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-line-2 bg-bar/90 text-ink hover:bg-panel-2";

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
  const backdrop = useUi((s) => s.backdrop);
  const {
    select,
    setTrails,
    setMotionGain,
    toggleLayer,
    setRenderer,
    setBackdrop,
  } = useUi.getState();

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
      }),
    [stationary, candidates, epoch, gain, trails, selectedId, layers],
  );

  const useAladin = renderer !== "svg" && aladinFailure === null;
  const onFailed = useCallback(
    (reason: string) => setAladinFailure(reason),
    [],
  );
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

  return (
    <div className="absolute inset-0">
      {useAladin ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center text-sm text-haze">
              Loading Aladin Lite…
            </div>
          }
        >
          <AladinSky
            key="aladin"
            field={field}
            items={items}
            onSelect={onSelect}
            onFailed={onFailed}
            ref={handle}
          />
        </Suspense>
      ) : (
        <SvgSky
          key="svg"
          field={field}
          items={items}
          onSelect={onSelect}
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
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-2 bg-bar/90 px-3 py-1.5 text-xs text-mist">
            <span id="renderer-label">Sky view</span>
            <div
              className="flex overflow-hidden rounded-[10px] border border-line-2"
              role="group"
              aria-labelledby="renderer-label"
            >
              <Button
                variant="segment"
                size="sm"
                data-active={useAladin}
                aria-pressed={useAladin}
                onClick={() => {
                  setAladinFailure(null);
                  setRenderer("aladin");
                }}
              >
                Aladin Lite
              </Button>
              <Button
                variant="segment"
                size="sm"
                data-active={!useAladin}
                aria-pressed={!useAladin}
                onClick={() => setRenderer("svg")}
              >
                Simple
              </Button>
            </div>
            {useAladin && (
              <label className="flex items-center gap-2">
                <Switch
                  checked={backdrop}
                  onCheckedChange={setBackdrop}
                  aria-label="Show real sky behind the synthetic sources"
                />
                Real sky behind
              </label>
            )}
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

        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
          className="pointer-events-auto flex flex-col gap-2"
        >
          <motion.button
            type="button"
            aria-label="Zoom in"
            className={iconBtn}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handle.current?.zoomIn()}
          >
            <Plus className="size-[18px]" aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Zoom out"
            className={iconBtn}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handle.current?.zoomOut()}
          >
            <Minus className="size-[18px]" aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Center on selected candidate"
            className={iconBtn}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() =>
              handle.current?.centerOn(selected ? selected.positions[0] : null)
            }
          >
            <Crosshair className="size-[18px]" aria-hidden="true" />
          </motion.button>
        </motion.div>
      </div>

      <TimelinePanel field={field} />
    </div>
  );
}
