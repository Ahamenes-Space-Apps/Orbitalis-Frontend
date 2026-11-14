import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Link2, Play, RotateCcw, Square, TriangleAlert } from 'lucide-react';
import { api, searchJob } from '@/data/api';
import { ApiError } from '@/data/errors';
import {
  useCandidates,
  useCapabilities,
  useField,
  useFrames,
  useJob,
  useJobs,
  usePresets,
  sortCandidates,
} from '@/data/hooks';
import type { CandidateSummary, Field, Job, MotionSearchParams } from '@/data/types';
import {
  formatCount,
  formatDuration,
  formatId,
  formatPositionAngle,
  formatRate,
  formatRelease,
  formatScore,
  formatSnr,
} from '@/lib/format';
import { useSearchPreservingPath, useUrlState } from '@/state/urlState';
import { ErrorNote } from '@/components/common/ErrorNote';
import { Skeleton } from '@/components/common/Primitives';
import { StatusChip } from '@/components/common/StatusChip';
import { CandidateDrawer } from '@/components/explorer/CandidateDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const DENSITIES: Array<{ value: MotionSearchParams['grid_density']; label: string; hint: string }> = [
  { value: 'coarse', label: 'Coarse', hint: 'Fastest; may miss fast movers.' },
  { value: 'normal', label: 'Normal', hint: 'Default balance.' },
  { value: 'fine', label: 'Fine', hint: 'Slowest; finds smaller steps.' },
];

function rateOf(candidate: CandidateSummary): number {
  return Math.hypot(candidate.motion.mu_e_arcsec_per_day, candidate.motion.mu_n_arcsec_per_day);
}

function angleOf(candidate: CandidateSummary): number {
  const degrees =
    (Math.atan2(candidate.motion.mu_e_arcsec_per_day, candidate.motion.mu_n_arcsec_per_day) * 180) /
    Math.PI;
  return ((degrees % 360) + 360) % 360;
}

function downloadCsv(candidates: CandidateSummary[], field: Field) {
  const header = [
    'candidate_id',
    'ordinal',
    'status',
    'ra_deg',
    'dec_deg',
    'rate_arcsec_per_day',
    'position_angle_deg',
    'stack_snr',
    'model_score',
  ];
  const rows = candidates.map((candidate) => [
    candidate.candidate_id,
    candidate.ordinal ?? '',
    candidate.status,
    candidate.position.ra.toFixed(6),
    candidate.position.dec.toFixed(6),
    rateOf(candidate).toFixed(3),
    angleOf(candidate).toFixed(1),
    candidate.stack_snr.toFixed(2),
    candidate.model_score?.value.toFixed(4) ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `orbitalis-${field.field_id}-candidates.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function JobCard({
  job,
  onCancel,
  onRunAgain,
  cancelling,
}: {
  job: Job;
  onCancel: () => void;
  onRunAgain: () => void;
  cancelling: boolean;
}) {
  const active = job.status === 'queued' || job.status === 'running';
  const now = useNow(active);
  const total = job.progress?.total ?? 0;
  const done = job.progress?.done ?? 0;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  const started = job.started_at ? Date.parse(job.started_at) : Date.parse(job.created_at);
  const finished = job.finished_at ? Date.parse(job.finished_at) : now;
  const elapsed = Number.isFinite(started) ? (finished - started) / 1000 : null;
  const warnings = job.progress?.warnings ?? [];
  const failure = job.error_code
    ? new ApiError(job.error_code, job.error?.message ?? job.error_code, 0, job.error?.detail)
    : null;

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={job.status} />
        <span className="text-[12px] text-mist">
          {job.kind === 'validation' ? 'Validation run' : 'Moving-object search'}
        </span>
        <span className="font-mono text-[10px] text-haze">{job.job_id}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-haze">{formatDuration(elapsed)}</span>
          {active && (
            <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling}>
              <Square className="size-3" aria-hidden="true" />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#1a2338]"
          role="progressbar"
          aria-label="Job progress"
          aria-valuemin={0}
          aria-valuemax={total || 100}
          aria-valuenow={total ? done : undefined}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              job.status === 'failed' ? 'bg-[#ff6b6b]' : active ? 'bg-amber' : 'bg-teal',
            )}
            style={{ width: `${total ? fraction * 100 : active ? 35 : 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-haze">
          <span>{job.progress?.stage ? `Stage: ${job.progress.stage}` : 'Waiting for the first stage…'}</span>
          <span className="font-mono">
            {total ? `${formatCount(done)} of ${formatCount(total)}` : '—'}
          </span>
        </div>
      </div>

      {warnings.length > 0 && (
        <details className="rounded-lg border border-line bg-bar px-3 py-2 text-[11px] text-haze">
          <summary className="cursor-pointer">
            {warnings.length} warning{warnings.length === 1 ? '' : 's'}
          </summary>
          <ul className="m-0 mt-1.5 list-disc pl-4">
            {warnings.map((warning) => (
              <li key={warning.code}>
                <span className="font-mono text-[10px]">{warning.code}</span> · {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {job.status === 'completed' && (
        <p className="m-0 text-[12px] text-mist">
          {formatCount(
            (job.result?.candidates_found as number | undefined) ??
              (job.result?.candidate_ids as string[] | undefined)?.length ??
              0,
          )}{' '}
          candidate
          {((job.result?.candidates_found as number | undefined) ??
            (job.result?.candidate_ids as string[] | undefined)?.length ??
            0) === 1
            ? ''
            : 's'}{' '}
          stored. They are unconfirmed.
        </p>
      )}

      {failure && (
        <div className="flex flex-col gap-1.5">
          <ErrorNote error={failure} compact />
          <div>
            <Button variant="outline" size="sm" onClick={onRunAgain}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Run again
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function NoField() {
  const presets = usePresets();
  const { openField } = useUrlState();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (preset: string) => api.createField({ preset }),
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
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">Candidates</div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight">Choose a field first</h1>
        <p className="m-0 max-w-2xl text-sm leading-relaxed text-mist">
          A search runs on one field. Open a preset here, or enter coordinates in the Explorer.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(presets.data?.data.presets ?? []).map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => create.mutate(preset.name)}
            disabled={create.isPending}
            className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-line-2 disabled:opacity-50"
          >
            <span className="text-[14px] font-semibold">{preset.name}</span>
            <span className="line-clamp-3 text-[11px] leading-snug text-mist">{preset.why}</span>
            <span className="mt-1 font-mono text-[10px] text-haze">
              {preset.release.toUpperCase()} · r {preset.radius_deg}°
            </span>
          </button>
        ))}
      </div>
      {create.isError && <ErrorNote error={create.error} />}
      {presets.isError && <ErrorNote error={presets.error} onRetry={() => presets.refetch()} />}
    </div>
  );
}

export function CandidatesPage() {
  const { values, update } = useUrlState();
  const navigate = useNavigate();
  const preserve = useSearchPreservingPath();
  const queryClient = useQueryClient();
  const capabilities = useCapabilities();
  const fieldId = values.f;
  const fieldQuery = useField(fieldId);
  const framesQuery = useFrames(fieldId);
  const field = fieldQuery.data?.data;

  const [rate, setRate] = useState<[number, number]>([0, 60]);
  const [angle, setAngle] = useState<[number, number]>([0, 360]);
  const [density, setDensity] = useState<MotionSearchParams['grid_density']>('normal');
  const [rank, setRank] = useState(false);
  const [frameMode, setFrameMode] = useState<'all' | 'choose'>('all');
  const [pickedFrames, setPickedFrames] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rankingEnabled = Boolean(capabilities.data?.data.ranking.enabled);
  const frames = framesQuery.data?.data.frames ?? [];
  const selectedFrames = frameMode === 'choose' ? pickedFrames : null;

  const params = useMemo<MotionSearchParams>(
    () => ({
      frame_refs: selectedFrames && selectedFrames.length > 0 ? selectedFrames : null,
      rate_arcsec_per_day: rate,
      position_angle_deg: angle,
      grid_density: density,
      rank: rankingEnabled && rank,
    }),
    [angle, density, pickedFrames, rank, rankingEnabled, selectedFrames, rate],
  );

  const signature = JSON.stringify(params);
  const [estimateSignature, setEstimateSignature] = useState(signature);
  useEffect(() => {
    const timer = window.setTimeout(() => setEstimateSignature(signature), 350);
    return () => window.clearTimeout(timer);
  }, [signature]);

  const estimate = useQuery({
    queryKey: ['estimate', fieldId, estimateSignature],
    queryFn: () =>
      api.estimate(searchJob(fieldId as string, JSON.parse(estimateSignature) as MotionSearchParams)),
    enabled: Boolean(fieldId) && field?.status === 'completed',
    staleTime: 10_000,
  });

  const run = useMutation({
    mutationFn: () => api.submitJob(searchJob(fieldId as string, params)),
    onSuccess: (envelope) => {
      setJobId(envelope.data.job_id);
      setNotice(
        envelope.meta.replayed
          ? 'Showing results from an earlier identical run.'
          : 'Search submitted. The job card updates as it runs.',
      );
      void queryClient.invalidateQueries({ queryKey: ['jobs', fieldId] });
    },
  });

  const job = useJob(jobId);
  const jobs = useJobs(fieldId);
  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      void queryClient.invalidateQueries({ queryKey: ['jobs', fieldId] });
    },
  });

  const basis = rankingEnabled ? 'model_score' : 'stack_snr';
  const candidatesQuery = useCandidates(fieldId, basis);
  const candidates = useMemo(
    () => sortCandidates(candidatesQuery.data?.data.candidates ?? [], basis),
    [basis, candidatesQuery.data],
  );

  const canSearch = field?.status === 'completed' && frames.length > 0;
  const tooLarge = estimate.data ? !estimate.data.data.ok : false;
  const runDisabled =
    !canSearch || tooLarge || run.isPending || estimate.isLoading || Boolean(estimate.error);

  if (!fieldId) return <NoField />;

  if (fieldQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <ErrorNote error={fieldQuery.error} onRetry={() => fieldQuery.refetch()} />
      </div>
    );
  }

  if (!field) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-10" role="status">
        <p className="m-0 text-sm text-haze">Loading the field…</p>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const basisLabel = basis === 'model_score' ? 'model score' : 'stack SNR';

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">Candidates</div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight">Run a moving-object search</h1>
          <p className="m-0 max-w-3xl text-[14px] leading-relaxed text-mist">
            Choose frames and a motion range. Results are candidates for inspection; they are
            unconfirmed and are ordered by {basisLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-[11px] text-mist">
          <span className="font-mono">
            {formatRelease(field.params.release)} · r {field.params.radius_deg}° ·{' '}
            {frames.length} frame{frames.length === 1 ? '' : 's'}
          </span>
          <StatusChip status={field.status} />
        </div>
      </div>

      <div
        className={cn(
          'grid min-w-0 gap-4',
          values.sel
            ? 'xl:grid-cols-[340px_minmax(0,1fr)_380px]'
            : 'xl:grid-cols-[360px_minmax(0,1fr)]',
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Search settings</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRate([0, 60]);
                  setAngle([0, 360]);
                  setDensity('normal');
                  setRank(false);
                  setFrameMode('all');
                  setPickedFrames([]);
                }}
              >
                Reset
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-mist">Frames</span>
                <span className="font-mono text-[10px] text-haze">{frames.length} available</span>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-line-2" role="group" aria-label="Frame selection">
                <Button
                  variant="segment"
                  size="sm"
                  className="flex-1"
                  data-active={frameMode === 'all'}
                  aria-pressed={frameMode === 'all'}
                  onClick={() => setFrameMode('all')}
                >
                  All compatible
                </Button>
                <Button
                  variant="segment"
                  size="sm"
                  className="flex-1"
                  data-active={frameMode === 'choose'}
                  aria-pressed={frameMode === 'choose'}
                  onClick={() => setFrameMode('choose')}
                >
                  Choose frames
                </Button>
              </div>
              {frameMode === 'choose' && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-bar p-2">
                  {frames.length === 0 && <p className="m-0 text-[11px] text-haze">No frames yet.</p>}
                  {frames.map((frame) => (
                    <label key={frame.frame_ref} className="flex cursor-pointer items-center gap-2 py-0.5 text-[11px] text-mist">
                      <input
                        type="checkbox"
                        checked={pickedFrames.includes(frame.frame_ref)}
                        onChange={(event) =>
                          setPickedFrames((current) =>
                            event.target.checked
                              ? [...current, frame.frame_ref]
                              : current.filter((ref) => ref !== frame.frame_ref),
                          )
                        }
                      />
                      <span className="font-mono">
                        {frame.release.toUpperCase()} · D{frame.detector} · {frame.wavelength_um.toFixed(2)} µm
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="m-0 text-[10px] leading-snug text-haze">
                Frames the stack policy rejects are reported by the server; originals are never
                hidden.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-mist">Rate range</span>
                <span className="font-mono text-[11px] text-amber">
                  {rate[0]}–{rate[1]}″/day
                </span>
              </div>
              <Slider
                min={0}
                max={60}
                step={1}
                value={rate}
                onValueChange={([lo, hi]) => setRate([Math.min(lo, hi), Math.max(lo, hi)])}
                thumbLabels={['Minimum rate', 'Maximum rate']}
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['Slow', [0, 10] as [number, number]],
                  ['Typical', [0, 30] as [number, number]],
                  ['All', [0, 60] as [number, number]],
                ].map(([label, value]) => (
                  <Button
                    key={label as string}
                    variant="pill"
                    size="sm"
                    data-active={rate[0] === (value as [number, number])[0] && rate[1] === (value as [number, number])[1]}
                    onClick={() => setRate(value as [number, number])}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-mist">Direction</span>
                <span className="font-mono text-[11px] text-amber">
                  {angle[0]}°–{angle[1]}°
                </span>
              </div>
              <Slider
                min={0}
                max={360}
                step={5}
                value={angle}
                onValueChange={([lo, hi]) => setAngle([Math.min(lo, hi), Math.max(lo, hi)])}
                thumbLabels={['Minimum position angle', 'Maximum position angle']}
              />
              <p className="m-0 text-[10px] leading-snug text-haze">
                Position angle is measured east of north. The full circle is the safe default.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-mist">Grid density</span>
              <div className="flex overflow-hidden rounded-lg border border-line-2" role="group" aria-label="Grid density">
                {DENSITIES.map((option) => (
                  <Button
                    key={option.value}
                    variant="segment"
                    size="sm"
                    className="flex-1"
                    data-active={density === option.value}
                    aria-pressed={density === option.value}
                    onClick={() => setDensity(option.value)}
                    title={option.hint}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {rankingEnabled && (
              <label className="flex items-center justify-between gap-2 text-[12px] text-mist">
                Rank after search
                <Switch checked={rank} onCheckedChange={setRank} aria-label="Rank after search" />
              </label>
            )}

            {!canSearch && (
              <p className="m-0 rounded-lg border border-amber/40 bg-amber/10 px-2.5 py-2 text-[11px] leading-snug text-amber-soft">
                Wait for the field to finish loading before searching.
              </p>
            )}

            <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bar px-3 py-2">
              {estimate.isLoading && <p className="m-0 text-[11px] text-haze">Estimating work…</p>}
              {estimate.isError && <ErrorNote error={estimate.error} compact />}
              {estimate.data && (
                <p className={cn('m-0 text-[11px]', tooLarge ? 'text-[#ff9d9d]' : 'text-mist')}>
                  Work {formatCount(estimate.data.data.work)} of {formatCount(estimate.data.data.budget)}.
                  {tooLarge
                    ? ' That search is too large. Narrow the motion range, radius or density.'
                    : ' Within the work budget.'}
                </p>
              )}
            </div>

            <Button onClick={() => run.mutate()} disabled={runDisabled}>
              <Play className="size-4" aria-hidden="true" />
              {run.isPending ? 'Submitting…' : 'Run search'}
            </Button>
            {notice && <p className="m-0 text-[11px] text-teal">{notice}</p>}
            {run.isError && <ErrorNote error={run.error} compact />}
          </Card>

          <Card className="gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Runs for this field</CardTitle>
              <span className="font-mono text-[10px] text-haze">{jobs.data?.data.jobs.length ?? 0}</span>
            </div>
            {jobs.isLoading && <p className="m-0 text-[11px] text-haze">Loading runs…</p>}
            {jobs.data?.data.jobs.length === 0 && (
              <p className="m-0 text-[11px] text-haze">No runs yet.</p>
            )}
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {(jobs.data?.data.jobs ?? []).map((item) => (
                <li key={item.job_id}>
                  <button
                    type="button"
                    onClick={() => setJobId(item.job_id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors',
                      jobId === item.job_id ? 'border-amber/60 bg-panel-2' : 'border-line hover:bg-panel',
                    )}
                  >
                    <StatusChip status={item.status} className="shrink-0 px-1.5 py-0.5 text-[10px]" />
                    <span className="min-w-0 flex-1 truncate text-mist">
                      {item.kind === 'validation' ? 'Validation' : 'Search'} ·{' '}
                      <span className="font-mono">{item.job_id}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {jobId && (
            <div className="flex flex-col gap-2">
              {job.isLoading && <Skeleton className="h-28 w-full" />}
              {job.isError && <ErrorNote error={job.error} onRetry={() => job.refetch()} />}
              {job.data && (
                <JobCard
                  job={job.data.data}
                  onCancel={() => cancel.mutate(job.data.data.job_id)}
                  onRunAgain={() => run.mutate()}
                  cancelling={cancel.isPending}
                />
              )}
            </div>
          )}

          <Card className="gap-2 p-0 sm:p-0">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <CardTitle className="text-base">Results</CardTitle>
              <span className="rounded-full border border-line-2 px-2 py-0.5 font-mono text-[10px] text-haze">
                {candidates.length} unconfirmed
              </span>
              <span className="text-[11px] text-haze">
                Ranked by {basisLabel}
                {basis === 'model_score' && ' (model)'}.
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(candidates, field)}
                  disabled={candidates.length === 0}
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  CSV
                </Button>
              </div>
            </div>

            {candidatesQuery.isLoading && (
              <p className="m-0 px-4 pb-4 text-[12px] text-haze">Loading candidates…</p>
            )}
            {candidatesQuery.isError && (
              <div className="px-4 pb-4">
                <ErrorNote error={candidatesQuery.error} onRetry={() => candidatesQuery.refetch()} />
              </div>
            )}
            {!candidatesQuery.isLoading && !candidatesQuery.isError && candidates.length === 0 && (
              <div className="px-4 pb-5 text-[12px] leading-relaxed text-haze">
                No moving-object candidates above threshold. That is a valid result; see Methods and
                limits for how sensitive the search is.
              </div>
            )}

            {candidates.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] border-collapse text-[12px]">
                  <caption className="sr-only">
                    Candidates for this field, ordered by {basisLabel}. All are unconfirmed.
                  </caption>
                  <thead>
                    <tr className="border-y border-line text-left text-[10px] tracking-widest text-haze">
                      <th scope="col" className="px-3 py-2 font-medium">RANK</th>
                      <th scope="col" className="px-3 py-2 font-medium">CANDIDATE</th>
                      <th scope="col" className="px-3 py-2 font-medium">TYPE</th>
                      <th scope="col" className="px-3 py-2 font-medium">POSITION</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">RATE</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">ANGLE</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">STACK SNR</th>
                      {basis === 'model_score' && (
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          MODEL SCORE
                        </th>
                      )}
                      <th scope="col" className="px-3 py-2 text-right font-medium">OPEN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, index) => {
                      const selected = values.sel === candidate.candidate_id;
                      return (
                        <tr
                          key={candidate.candidate_id}
                          className={cn(
                            'border-b border-[#1b2438] transition-colors',
                            selected ? 'bg-[#17203a]' : 'hover:bg-panel',
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-haze">{index + 1}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => update({ sel: candidate.candidate_id })}
                              className="cursor-pointer font-mono font-semibold text-white underline-offset-2 hover:underline"
                            >
                              {formatId(candidate.ordinal)}
                            </button>
                            <span className="ml-2 rounded-full border border-amber/50 px-1.5 py-0.5 text-[9px] text-amber">
                              Unconfirmed
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-mist">
                            {candidate.static_source ? 'Static flag' : 'Moving'}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-mist">
                            {candidate.position.ra.toFixed(4)}, {candidate.position.dec.toFixed(4)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-mist">
                            {formatRate(rateOf(candidate))}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-mist">
                            {formatPositionAngle(angleOf(candidate)).replace(' (east of north)', '')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-mist">
                            {formatSnr(candidate.stack_snr)}
                          </td>
                          {basis === 'model_score' && (
                            <td className="px-3 py-2 text-right font-mono text-mist">
                              {candidate.model_score ? formatScore(candidate.model_score.value) : '—'}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 min-h-0"
                                aria-label={`Copy link to ${formatId(candidate.ordinal)}`}
                                onClick={() => {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('sel', candidate.candidate_id);
                                  void navigator.clipboard.writeText(url.toString()).catch(() => undefined);
                                }}
                              >
                                <Link2 className="size-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => update({ sel: candidate.candidate_id })}
                              >
                                Open
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bar px-3 py-2 text-[11px] leading-snug text-haze">
            <TriangleAlert className="size-3.5 shrink-0 text-amber" aria-hidden="true" />
            <span>
              Precision is measured against the sources injected in an experiment. Detections in
              real data that match nothing known are listed as candidates, not as errors.
            </span>
            <button
              type="button"
              className="cursor-pointer text-amber underline-offset-2 hover:underline"
              onClick={() => navigate(preserve('/methods'))}
            >
              Methods and limits
            </button>
          </div>
        </div>

        {values.sel && (
          <CandidateDrawer
            candidateId={values.sel}
            field={field}
            variant="pane"
            className="min-h-[500px] xl:sticky xl:top-4 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:h-[calc(100vh-120px)]"
            onClose={() => update({ sel: null })}
            onSelectOnMap={() => navigate(preserve('/'))}
          />
        )}
      </div>
    </div>
  );
}
