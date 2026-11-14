import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Crosshair, X } from 'lucide-react';
import { api, usingMockApi } from '@/data/api';
import { ErrorNote } from '@/components/common/ErrorNote';
import { usePresets, useReleases } from '@/data/hooks';
import { useUrlState } from '@/state/urlState';
import { useUi } from '@/store/useUi';
import { formatDec, formatRa } from '@/lib/format';
import { parseCoordinates } from '@/lib/parseCoords';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Preset } from '@/data/types';

const RADII = [0.05, 0.1, 0.25, 0.5];

function PresetCard({ preset, onOpen }: { preset: Preset; onOpen: (preset: Preset) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(preset)}
      className="group flex min-h-[140px] cursor-pointer flex-col justify-between gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-line-2 hover:bg-panel-2"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold text-ink">{preset.name}</span>
          <span className="rounded-full border border-line-2 px-2 py-0.5 font-mono text-[10px] text-haze">
            {preset.release.toUpperCase()}
          </span>
        </div>
        <p className="m-0 line-clamp-4 text-[12px] leading-snug text-mist">{preset.why}</p>
      </div>
      <div className="flex items-end justify-between gap-2 font-mono text-[11px] text-haze">
        <span>
          {formatRa(preset.ra)} · {formatDec(preset.dec)}
        </span>
        <ArrowRight className="size-4 text-amber transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </button>
  );
}

export function FieldEntry({ variant = 'landing' }: { variant?: 'landing' | 'dialog' }) {
  const presets = usePresets();
  const releases = useReleases();
  const { openField } = useUrlState();
  const close = useUi((state) => state.setFieldEntryOpen);
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [radius, setRadius] = useState(0.1);
  const [release, setRelease] = useState<string>('qr2');
  const [error, setError] = useState<unknown>(null);

  const parsed = useMemo(() => parseCoordinates(input), [input]);
  const matchingPresets = useMemo(() => {
    const text = input.trim().toLowerCase();
    if (!text) return [];
    return (presets.data?.data.presets ?? []).filter((preset) => preset.name.includes(text));
  }, [input, presets.data]);

  const create = useMutation({
    mutationFn: api.createField,
    onSuccess: (envelope) => {
      const field = envelope.data;
      queryClient.invalidateQueries();
      openField({
        f: field.field_id,
        ra: field.params.ra,
        dec: field.params.dec,
        r: field.params.radius_deg,
        rel: field.params.release,
      });
      close(false);
    },
    onError: (cause) => setError(cause),
  });

  function openPreset(preset: Preset) {
    setError(null);
    create.mutate({ preset: preset.name });
  }

  function submitCoordinates() {
    if (!parsed) return;
    setError(null);
    create.mutate({ ra: parsed.ra, dec: parsed.dec, radius_deg: radius, release });
  }

  const defaultRelease = release || releases.data?.data.releases.find((r) => r.enabled)?.id || 'qr2';

  const body = (
    <div className={cn('flex flex-col gap-6', variant === 'landing' && 'mx-auto w-full max-w-5xl')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">Explorer</div>
          <h1 className="m-0 mt-1 text-3xl font-semibold tracking-tight">
            {variant === 'landing' ? 'Choose a patch of sky' : 'Open another field'}
          </h1>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-relaxed text-mist">
            Start from a curated preset, or enter ICRS coordinates. The Explorer streams the original
            SPHEREx frames, then lets you scrub time and wavelength.
          </p>
        </div>
        {variant === 'dialog' && (
          <Button variant="ghost" size="icon" aria-label="Close field entry" onClick={() => close(false)}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="preset-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="preset-heading" className="m-0 text-base font-semibold">
            Presets
          </h2>
          <span className="text-[11px] text-haze">
            {usingMockApi
              ? 'Demo data loads instantly, with stored results.'
              : 'Open a preset to load its field and observations.'}
          </span>
        </div>
        {presets.isLoading && <p className="m-0 text-sm text-haze">Loading presets…</p>}
        {presets.isError && <ErrorNote error={presets.error} onRetry={() => presets.refetch()} />}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(presets.data?.data.presets ?? []).map((preset) => (
            <PresetCard key={preset.name} preset={preset} onOpen={openPreset} />
          ))}
        </div>
      </section>

      <section
        className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5"
        aria-labelledby="coord-heading"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="coord-heading" className="m-0 text-base font-semibold">
            Coordinates
          </h2>
          <span className="text-[11px] text-haze">ICRS degrees, or 10h52m04s +57d28m11s</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
          <label className="flex flex-col gap-1.5 text-[12px] text-mist">
            Position
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (parsed) submitCoordinates();
                  else if (matchingPresets.length === 1) openPreset(matchingPresets[0]);
                }
              }}
              placeholder="e.g. 156.09 -41.64"
              aria-invalid={input.length > 0 && !parsed && matchingPresets.length === 0}
              className="min-h-11 rounded-lg border border-line-2 bg-bar px-3 font-mono text-sm text-ink placeholder:text-haze focus:border-amber focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-mist">
            Radius
            <select
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="min-h-11 rounded-lg border border-line-2 bg-bar px-3 text-sm text-ink focus:border-amber focus:outline-none"
            >
              {RADII.map((value) => (
                <option key={value} value={value}>
                  {value}° ({`${(value * 60).toFixed(0)}′`})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-mist">
            Release
            <select
              value={defaultRelease}
              onChange={(event) => setRelease(event.target.value)}
              className="min-h-11 rounded-lg border border-line-2 bg-bar px-3 text-sm text-ink focus:border-amber focus:outline-none"
            >
              {(releases.data?.data.releases ?? []).map((item) => (
                <option key={item.id} value={item.id} disabled={!item.enabled}>
                  {item.id.toUpperCase()} · {item.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={submitCoordinates} disabled={!parsed || create.isPending}>
            <Crosshair className="size-4" aria-hidden="true" />
            {create.isPending ? 'Opening…' : 'Open field'}
          </Button>
        </div>

        {input && !parsed && matchingPresets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matchingPresets.map((preset) => (
              <Button key={preset.name} size="sm" variant="outline" onClick={() => openPreset(preset)}>
                {preset.name}
              </Button>
            ))}
          </div>
        )}

        {parsed && (
          <p className="m-0 font-mono text-[12px] text-teal">
            Parsed {formatRa(parsed.ra)} · {formatDec(parsed.dec)} · r {radius}° · {defaultRelease.toUpperCase()}
          </p>
        )}

        {usingMockApi && (
          <p className="m-0 text-[12px] leading-snug text-haze">
            Mock mode serves the six demo presets. To search an arbitrary position, run the backend
            with <code className="font-mono">ORB_OFFLINE=1</code> and set{' '}
            <code className="font-mono">VITE_API_URL</code>.
          </p>
        )}

        {error !== null && <ErrorNote error={error} compact />}
      </section>

      <p className="m-0 text-[12px] leading-relaxed text-haze">
        Name lookup is not part of the current API contract; enter coordinates. Every candidate the
        search returns is unconfirmed.
      </p>
    </div>
  );

  if (variant === 'dialog') {
    return (
      <div
        className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-6 pt-[7vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Open a field"
        onClick={(event) => {
          if (event.target === event.currentTarget) close(false);
        }}
      >
        <div className="w-full max-w-5xl rounded-2xl border border-line bg-bar p-6 shadow-[0_20px_80px_#000a]">
          {body}
        </div>
      </div>
    );
  }

  return <div className="mx-auto w-full max-w-6xl px-6 py-10">{body}</div>;
}
