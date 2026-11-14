import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layers, RefreshCw, X } from 'lucide-react';
import { api } from '@/data/api';
import { ApiError } from '@/data/errors';
import {
  useCandidates,
  useCapabilities,
  useField,
  useFieldLightcurve,
  useFieldStream,
  useFrames,
  useOverlays,
  useSpectrum,
} from '@/data/hooks';
import type { Field, Overlay } from '@/data/types';
import { formatDec, formatRa, formatRelease } from '@/lib/format';
import type { SkyPos } from '@/lib/coords';
import { useSearchPreservingPath, useUrlState, type LayerName } from '@/state/urlState';
import { useUi } from '@/store/useUi';
import { ErrorNote } from '@/components/common/ErrorNote';
import { Skeleton } from '@/components/common/Primitives';
import { StatusChip } from '@/components/common/StatusChip';
import { LightcurveChart } from '@/components/charts/LightcurveChart';
import { SpectrumView } from '@/components/charts/SpectrumView';
import { CandidateDrawer } from '@/components/explorer/CandidateDrawer';
import { CandidateQueue } from '@/components/explorer/CandidateQueue';
import { FieldEntry } from '@/components/explorer/FieldEntry';
import { FrameScrubber } from '@/components/explorer/FrameScrubber';
import { LayerPanel } from '@/components/explorer/LayerPanel';
import { SkyView } from '@/components/explorer/SkyView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function FieldBuilder({
  ra,
  dec,
  radius,
  release,
  children,
}: {
  ra: number;
  dec: number;
  radius: number;
  release: string | null;
  children: (fieldId: string) => ReactNode;
}) {
  const { update } = useUrlState();
  const started = useRef(false);
  const create = useMutation({
    mutationFn: api.createField,
    onSuccess: (envelope) => update({ f: envelope.data.field_id }, { replace: true }),
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create.mutate({ ra, dec, radius_deg: radius, release });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (create.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <ErrorNote
          error={create.error}
          onRetry={() => {
            create.reset();
            create.mutate({ ra, dec, radius_deg: radius, release });
          }}
        />
        <p className="mt-4 text-[12px] leading-relaxed text-haze">
          The field is built from the URL parameters, so this link stays usable. Nothing else is
          lost.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10" role="status">
      <p className="m-0 text-sm text-haze">Rebuilding this view from the URL…</p>
      <Skeleton className="h-40 w-full" />
      <p className="m-0 font-mono text-[11px] text-haze">
        RA {formatRa(ra)} · Dec {formatDec(dec)} · r {radius}° · {formatRelease(release)}
      </p>
      {create.data ? children(create.data.data.field_id) : null}
    </div>
  );
}

function FieldBuildHeader({
  field,
  frameCount,
  candidateCount,
  layersOpen,
  onToggleLayers,
}: {
  field: Field;
  frameCount: number;
  candidateCount: number;
  layersOpen: boolean;
  onToggleLayers: () => void;
}) {
  const active = field.status === 'running' || field.status === 'queued';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-bar px-3 py-2">
      <StatusChip status={field.status} />
      <span className="font-mono text-[11px] text-mist">
        {formatRa(field.params.ra)} · {formatDec(field.params.dec)} · r {field.params.radius_deg}° ·{' '}
        {formatRelease(field.params.release)}
      </span>
      <span className="text-[11px] text-haze">
        {frameCount} frame{frameCount === 1 ? '' : 's'} · {candidateCount} candidate
        {candidateCount === 1 ? '' : 's'}
      </span>
      {active && (
        <span className="flex items-center gap-2 text-[11px] text-amber" role="status">
          <span className="h-1 w-24 overflow-hidden rounded-full bg-[#1a2338]">
            <span className="block h-full w-1/3 animate-pulse rounded-full bg-amber" />
          </span>
          {field.frames_done} stored
        </span>
      )}
      {field.status === 'failed' && (
        <span className="text-[11px] text-[#ff9d9d]">
          The build stopped{field.error_code ? ` (${field.error_code})` : ''}. Frames already
          received stay usable.
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={layersOpen}
          onClick={onToggleLayers}
          className="gap-1.5"
        >
          <Layers className="size-3.5" aria-hidden="true" />
          Layers
        </Button>
      </div>
    </div>
  );
}

function SkyPointPanel({
  fieldId,
  point,
  onClose,
}: {
  fieldId: string;
  point: SkyPos;
  onClose: () => void;
}) {
  const lightcurve = useFieldLightcurve(fieldId, point.ra, point.dec);
  const spectrum = useSpectrum(fieldId, point.ra, point.dec);
  const [copied, setCopied] = useState(false);

  return (
    <div className="absolute right-3 bottom-3 z-20 w-[min(360px,calc(100%-24px))] rounded-xl border border-line bg-bar/95 p-3 shadow-[0_16px_50px_#0009] backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-[12px] font-semibold">Sky position</h2>
          <p className="m-0 font-mono text-[10px] text-haze">
            {formatRa(point.ra)} · {formatDec(point.dec)}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="size-7 min-h-0" aria-label="Close sky position" onClick={onClose}>
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard
              .writeText(`${point.ra.toFixed(6)}, ${point.dec.toFixed(6)}`)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? 'Copied' : 'Copy coordinates'}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <h3 className="m-0 text-[11px] font-semibold tracking-[0.12em] text-haze uppercase">
          Light curve here
        </h3>
        {lightcurve.isLoading && <Skeleton className="h-24 w-full" />}
        {lightcurve.isError && (
          <p className="m-0 text-[11px] leading-snug text-haze">
            No light curve could be measured at this position.
          </p>
        )}
        {lightcurve.data && <LightcurveChart lightcurve={lightcurve.data.data} compact />}
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <h3 className="m-0 mb-1 text-[11px] font-semibold tracking-[0.12em] text-haze uppercase">
          Spectrum
        </h3>
        {spectrum.data ? (
          <SpectrumView spectrum={spectrum.data.data} />
        ) : (
          <p className="m-0 text-[11px] text-haze">Checking the spectrum…</p>
        )}
      </div>
    </div>
  );
}

function ExplorerWorkspace({ fieldId }: { fieldId: string }) {
  const { values, update, remove } = useUrlState();
  const navigate = useNavigate();
  const preserve = useSearchPreservingPath();
  const fieldQuery = useField(fieldId);
  const capabilities = useCapabilities();
  const framesQuery = useFrames(fieldId);
  const [frameOrder, setFrameOrder] = useState<'time' | 'wavelength'>('time');
  const [layersOpen, setLayersOpen] = useState(true);
  const [skyPoint, setSkyPoint] = useState<SkyPos | null>(null);
  const queryClient = useQueryClient();

  const field = fieldQuery.data?.data;
  const frames = framesQuery.data?.data.frames ?? [];
  const rankEnabled = Boolean(capabilities.data?.data.ranking.enabled);
  const basis = rankEnabled ? 'model_score' : 'stack_snr';
  const candidatesQuery = useCandidates(fieldId, basis);
  const candidates = candidatesQuery.data?.data.candidates ?? [];
  const modelVersion =
    candidates.find((candidate) => candidate.model_score)?.model_score?.model_version ??
    capabilities.data?.data.ranking.model_version ??
    null;

  const known = useOverlays(fieldId, 'known', values.layers.includes('known'));
  const hypothesis = useOverlays(fieldId, 'hypothesis', values.layers.includes('hypothesis'));

  const active = field?.status === 'queued' || field?.status === 'running';
  useFieldStream(fieldId, Boolean(active));

  const orderedFrames = useMemo(
    () =>
      [...frames].sort((a, b) =>
        frameOrder === 'time' ? a.mjd - b.mjd : a.wavelength_um - b.wavelength_um,
      ),
    [frameOrder, frames],
  );
  const selectedFrame = useMemo(() => {
    if (orderedFrames.length === 0) return null;
    return orderedFrames.find((frame) => frame.frame_ref === values.t) ?? orderedFrames[0];
  }, [orderedFrames, values.t]);

  useEffect(() => {
    if (!selectedFrame) return;
    if (values.t !== selectedFrame.frame_ref) update({ t: selectedFrame.frame_ref }, { replace: true });
  }, [selectedFrame, update, values.t]);

  const selectedId = values.sel;
  const [drawerClosed, setDrawerClosed] = useState(false);
  useEffect(() => {
    setDrawerClosed(false);
  }, [selectedId]);
  const hoveredId = useUi((state) => state.hoveredCandidateId);
  const setHovered = useUi((state) => state.setHoveredCandidateId);
  const playing = useUi((state) => state.playing);
  const setPlaying = useUi((state) => state.setPlaying);
  const speed = useUi((state) => state.speed);
  const setSpeed = useUi((state) => state.setSpeed);
  const showFlags = useUi((state) => state.showFlags);
  const setShowFlags = useUi((state) => state.setShowFlags);
  const queueCollapsed = useUi((state) => state.queueCollapsed);

  const toggleLayer = (layer: LayerName) => {
    const next = values.layers.includes(layer)
      ? values.layers.filter((item) => item !== layer)
      : [...values.layers, layer];
    update({ layers: next });
  };

  const rebuild = useMutation({
    mutationFn: () =>
      api.createField({
        ra: field?.params.ra ?? values.ra ?? undefined,
        dec: field?.params.dec ?? values.dec ?? undefined,
        radius_deg: field?.params.radius_deg ?? values.r,
        release: field?.params.release ?? values.rel,
      }),
    onSuccess: (envelope) => {
      update({ f: envelope.data.field_id }, { replace: true });
      void queryClient.invalidateQueries();
    },
  });

  if (fieldQuery.isError) {
    const missing = fieldQuery.error instanceof ApiError && fieldQuery.error.code === 'ORB-API-002';
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <ErrorNote error={fieldQuery.error} onRetry={() => fieldQuery.refetch()} />
        {missing && values.ra !== null && values.dec !== null && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
            <p className="m-0 text-sm text-mist">
              This field is no longer on the server. Rebuild it from the URL parameters.
            </p>
            <div>
              <Button onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
                <RefreshCw className={cn('size-4', rebuild.isPending && 'animate-spin')} aria-hidden="true" />
                {rebuild.isPending ? 'Rebuilding…' : 'Rebuild this view'}
              </Button>
            </div>
            {rebuild.isError && <ErrorNote error={rebuild.error} compact />}
          </div>
        )}
      </div>
    );
  }

  if (!field) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6" role="status">
        <p className="m-0 text-sm text-haze">Loading the field…</p>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={cn(
          'hidden min-w-0 shrink flex-col border-r border-line bg-bar transition-[flex-basis] duration-200 md:flex',
          queueCollapsed ? 'basis-[56px]' : 'basis-[300px]',
        )}
      >
        <CandidateQueue
          candidates={candidates}
          selectedId={selectedId}
          basis={basis}
          modelVersion={modelVersion}
          loading={candidatesQuery.isLoading}
          error={candidatesQuery.error}
          canSearch={field.status === 'completed'}
          onSelect={(candidateId) => {
            setDrawerClosed(false);
            update({ sel: candidateId });
          }}
          onHover={setHovered}
          onRunSearch={() => navigate(preserve('/candidates'))}
        />      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <FieldBuildHeader
          field={field}
          frameCount={frames.length}
          candidateCount={candidates.length}
          layersOpen={layersOpen}
          onToggleLayers={() => setLayersOpen((value) => !value)}
        />

        <div className="relative flex min-h-0 flex-1">
          <main className="relative min-h-[360px] min-w-0 flex-1 overflow-hidden" aria-label="Sky explorer">
            {framesQuery.isError && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-field/80 p-6">
                <ErrorNote error={framesQuery.error} onRetry={() => framesQuery.refetch()} />
              </div>
            )}
            <SkyView
              field={field}
              frames={frames}
              candidates={candidates}
              selectedId={selectedId}
              hoveredId={hoveredId}
              frame={selectedFrame}
              view={values.view}
              sys={values.sys}
              layers={values.layers}
              exag={values.exag}
              showFlags={showFlags}
              known={known.data?.data as Overlay | undefined}
              hypothesis={hypothesis.data?.data as Overlay | undefined}
              onSelect={(candidateId) => {
                if (candidateId) {
                  setDrawerClosed(false);
                  update({ sel: candidateId });
                } else {
                  remove(['sel']);
                }
              }}
              onHover={setHovered}
              onCursor={(position) => useUi.getState().setCursor(position)}
              onSkyClick={(position) => setSkyPoint(position)}
            />
            {skyPoint && (
              <SkyPointPanel fieldId={fieldId} point={skyPoint} onClose={() => setSkyPoint(null)} />
            )}
            {selectedId && !drawerClosed && (
              <CandidateDrawer
                candidateId={selectedId}
                field={field}
                onClose={() => setDrawerClosed(true)}
                onSelectOnMap={() => {
                  setSkyPoint(null);
                  setDrawerClosed(true);
                }}
              />
            )}
          </main>

          {layersOpen && (
            <aside className="hidden w-[250px] shrink-0 xl:flex">
              <LayerPanel
                field={field}
                frames={frames}
                candidates={candidates}
                known={known.data?.data as Overlay | undefined}
                hypothesis={hypothesis.data?.data as Overlay | undefined}
                layers={values.layers}
                exag={values.exag}
                view={values.view}
                showFlags={showFlags}
                selectedWavelength={selectedFrame?.wavelength_um ?? null}
                onToggleLayer={toggleLayer}
                onExaggeration={(value) => update({ exag: value })}
                onView={(view) => update({ view })}
                onShowFlags={setShowFlags}
              />
            </aside>
          )}
        </div>

        <FrameScrubber
          frames={orderedFrames}
          selectedRef={selectedFrame?.frame_ref ?? null}
          order={frameOrder}
          playing={playing}
          speed={speed}
          onOrder={setFrameOrder}
          onSelect={(frameRef) => update({ t: frameRef })}
          onPlaying={setPlaying}
          onSpeed={setSpeed}
        />
      </div>
    </div>
  );
}

export function ExplorerPage() {
  const { values } = useUrlState();

  if (values.f) return <ExplorerWorkspace fieldId={values.f} />;

  if (values.ra !== null && values.dec !== null) {
    return (
      <FieldBuilder key={`${values.ra},${values.dec}`} ra={values.ra} dec={values.dec} radius={values.r} release={values.rel}>
        {(fieldId) => <ExplorerWorkspace fieldId={fieldId} />}
      </FieldBuilder>
    );
  }

  return <FieldEntry variant="landing" />;
}
