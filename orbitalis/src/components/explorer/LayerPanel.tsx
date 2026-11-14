import type { CandidateSummary, Field, Frame, Overlay } from '@/data/types';
import type { LayerName, ViewMode } from '@/state/urlState';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatArcsec } from '@/lib/format';
import { cn } from '@/lib/utils';

interface LayerPanelProps {
  field: Field;
  frames: Frame[];
  candidates: CandidateSummary[];
  known: Overlay | undefined;
  hypothesis: Overlay | undefined;
  layers: LayerName[];
  exag: number;
  view: ViewMode;
  showFlags: boolean;
  onToggleLayer: (layer: LayerName) => void;
  onExaggeration: (value: number) => void;
  onView: (view: ViewMode) => void;
  onShowFlags: (show: boolean) => void;
}

const SWATCH: Record<string, string> = {
  moving: 'size-3 rounded-full border-[1.5px] border-amber',
  static: 'size-3 rounded-full border-[1.5px] border-dashed border-mist',
  known: 'size-2.5 rotate-45 border border-haze',
  hypothesis: 'h-2.5 w-3.5 border border-dashed border-[#6cb6ff]',
  trails: 'h-0.5 w-4 bg-amber/70',
};

export function LayerPanel({
  frames,
  candidates,
  known,
  hypothesis,
  layers,
  exag,
  view,
  showFlags,
  onToggleLayer,
  onExaggeration,
  onView,
  onShowFlags,
}: LayerPanelProps) {
  const moving = candidates.filter((candidate) => !candidate.static_source).length;
  const staticCount = candidates.length - moving;
  const knownCount = known?.items.length ?? 0;
  const hypothesisFlat = hypothesis?.items.filter((item) => item.shape) ?? [];
  const hypothesisInside = hypothesisFlat.filter((item) => item.contains_field).length;

  const rates = candidates.map((candidate) =>
    Math.hypot(candidate.motion.mu_e_arcsec_per_day, candidate.motion.mu_n_arcsec_per_day),
  );
  const maxRate = rates.length ? Math.max(...rates) : 0;
  const spanDays =
    frames.length > 1
      ? Math.max(...frames.map((frame) => frame.mjd)) - Math.min(...frames.map((frame) => frame.mjd))
      : 0;
  const realShiftArcsec = maxRate * spanDays;
  const pixelScale =
    frames.find((frame) => frame.meta.pixel_scale_arcsec)?.meta.pixel_scale_arcsec ?? 6.15;
  const realShiftPx = realShiftArcsec / pixelScale;

  const rows: Array<{ key: LayerName; label: string; count: number | null; disabled?: boolean }> = [
    { key: 'moving', label: 'Moving candidates', count: moving },
    { key: 'static', label: 'Static-source flags', count: staticCount, disabled: staticCount === 0 },
    { key: 'trails', label: 'Motion trails', count: null },
    { key: 'known', label: 'Known objects', count: knownCount, disabled: knownCount === 0 },
    {
      key: 'hypothesis',
      label: 'Planet X hypothesis',
      count: hypothesisFlat.length,
      disabled: hypothesisFlat.length === 0,
    },
  ];

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto border-l border-line bg-bar p-3 text-[12px]">
      <section className="flex flex-col gap-2" aria-labelledby="layers-heading">
        <h2 id="layers-heading" className="m-0 text-[11px] font-semibold tracking-[0.14em] text-haze uppercase">
          Layers
        </h2>
        {rows.map((row) => (
          <label
            key={row.key}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1',
              row.disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-panel',
            )}
          >
            <Switch
              checked={layers.includes(row.key) && !row.disabled}
              disabled={row.disabled}
              onCheckedChange={() => onToggleLayer(row.key)}
              aria-label={row.label}
            />
            <span aria-hidden="true" className={cn('shrink-0', SWATCH[row.key])} />
            <span className="min-w-0 flex-1 truncate text-mist">{row.label}</span>
            {row.count !== null && <span className="font-mono text-[11px] text-haze">{row.count}</span>}
          </label>
        ))}
        {hypothesisFlat.length > 0 && hypothesisInside === 0 && (
          <p className="m-0 px-1 text-[11px] leading-snug text-haze">
            {hypothesisFlat.length} published regions are outside this field; they are not drawn here.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-3" aria-labelledby="view-heading">
        <h2 id="view-heading" className="m-0 text-[11px] font-semibold tracking-[0.14em] text-haze uppercase">
          Sky view
        </h2>
        <div className="flex overflow-hidden rounded-lg border border-line-2" role="group" aria-label="Sky view">
          <Button
            variant="segment"
            size="sm"
            data-active={view === 'simple'}
            aria-pressed={view === 'simple'}
            onClick={() => onView('simple')}
            className="flex-1"
          >
            Simple
          </Button>
          <Button
            variant="segment"
            size="sm"
            data-active={view === 'aladin'}
            aria-pressed={view === 'aladin'}
            onClick={() => onView('aladin')}
            className="flex-1"
          >
            Aladin
          </Button>
        </div>
        <label className="flex items-center justify-between gap-2 px-1">
          <span className="text-mist">Show flags</span>
          <Switch checked={showFlags} onCheckedChange={onShowFlags} aria-label="Show quality flags" />
        </label>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-3" aria-labelledby="motion-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="motion-heading" className="m-0 text-[11px] font-semibold tracking-[0.14em] text-haze uppercase">
            Motion
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onExaggeration(1)} aria-label="Show true motion">
            ×1
          </Button>
        </div>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[exag]}
          onValueChange={([value]) => onExaggeration(value)}
          thumbLabels={['Motion exaggeration']}
        />
        <p className="m-0 leading-snug text-mist" data-testid="motion-note">
          Motion exaggerated ×{exag}.{' '}
          {spanDays > 0
            ? `Real shift over this field's ${spanDays.toFixed(0)} days: ${
                realShiftPx < 0.1 ? '<0.1' : realShiftPx.toFixed(1)
              } px (${formatArcsec(realShiftArcsec)}). `
            : 'Real shift is not available until frames load. '}
          {realShiftPx >= 1
            ? 'Real shifts are visible at this scale.'
            : 'Real shifts are sub-pixel.'}
        </p>
      </section>
    </div>
  );
}
