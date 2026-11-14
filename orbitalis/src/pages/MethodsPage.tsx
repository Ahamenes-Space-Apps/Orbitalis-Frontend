import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, FlaskConical } from 'lucide-react';
import { api } from '@/data/api';
import { ApiError } from '@/data/errors';
import {
  useCapabilities,
  useExperiments,
  useField,
  useJob,
  useMethods,
  usePresets,
  useReleases,
} from '@/data/hooks';
import type { Experiment, ExperimentMetrics } from '@/data/types';
import {
  formatArcsec,
  formatCount,
  formatPercent,
  formatRelease,
} from '@/lib/format';
import { useSearchPreservingPath, useUrlState } from '@/state/urlState';
import { ErrorNote } from '@/components/common/ErrorNote';
import { Stat } from '@/components/common/Primitives';
import { StatusChip } from '@/components/common/StatusChip';
import { CompletenessChart } from '@/components/charts/CompletenessChart';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SECTIONS = [
  ['what', 'What ORBITALIS does'],
  ['data', 'Data & preparation'],
  ['validation', 'Validation'],
  ['model', 'Model card'],
  ['limits', 'Limitations'],
  ['credits', 'Credits'],
] as const;

const LIMITS = [
  'Candidates are unconfirmed. Confirmation needs independent follow-up outside this tool.',
  'A model score is a prediction. It ranks candidates for inspection; it is not a calibrated probability.',
  'Real shifts are often smaller than one pixel. The sky view may exaggerate motion and says so.',
  'QR2 and QR3 differ, and DR1 reprocessing is expected. A result applies to the release it was built from.',
  'Only the selected field and release are searched.',
  'Detections in real data that match nothing known are listed as candidates, not as errors.',
  'Spectral types need enough wavelength coverage; otherwise the spectrum shows measurements only.',
];

function recallInterval(metrics: ExperimentMetrics): [number, number] | null {
  if (typeof metrics.recall_ci_low === 'number' && typeof metrics.recall_ci_high === 'number') {
    return [metrics.recall_ci_low, metrics.recall_ci_high];
  }
  if (Array.isArray(metrics.recall_ci)) return metrics.recall_ci;
  return null;
}

function precisionInterval(metrics: ExperimentMetrics): [number, number] | null {
  if (typeof metrics.precision_ci_low === 'number' && typeof metrics.precision_ci_high === 'number') {
    return [metrics.precision_ci_low, metrics.precision_ci_high];
  }
  if (Array.isArray(metrics.precision_ci)) return metrics.precision_ci;
  return null;
}

function ParameterList({ experiment }: { experiment: Experiment }) {
  const params = experiment.params as Record<string, unknown>;
  const rows: Array<[string, string]> = [];
  const label = params.label;
  if (typeof label === 'string') rows.push(['Label', label]);
  if (typeof params.seed === 'number') rows.push(['Seed', String(params.seed)]);
  if (typeof params.n_injections === 'number') rows.push(['Injections', String(params.n_injections)]);
  if (typeof params.snr_min === 'number' && typeof params.snr_max === 'number') {
    rows.push(['Injected SNR', `${params.snr_min}–${params.snr_max}`]);
  }
  if (
    typeof params.speed_min_arcsec_per_day === 'number' &&
    typeof params.speed_max_arcsec_per_day === 'number'
  ) {
    rows.push([
      'Speed',
      `${params.speed_min_arcsec_per_day}–${params.speed_max_arcsec_per_day}″/day`,
    ]);
  }
  if (typeof params.background_variant_used === 'string') {
    rows.push(['Background variant', params.background_variant_used]);
  }
  if (typeof params.match_radius_px === 'number') {
    rows.push(['Match radius', `${params.match_radius_px} px`]);
  }
  if (typeof params.injection_stage === 'string') {
    rows.push(['Injection stage', params.injection_stage]);
  }

  return (
    <dl className="m-0 grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[11px]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-haze">{key}</dt>
          <dd className="m-0 font-mono text-mist">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const metrics = experiment.metrics;
  const recall = recallInterval(metrics);
  const precision = precisionInterval(metrics);
  const frameRefs = (experiment.params as Record<string, unknown>).frame_refs_used;

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {typeof experiment.params.label === 'string'
                ? experiment.params.label
                : 'Validation experiment'}
            </CardTitle>
            {metrics.partial && (
              <span className="rounded-full border border-amber/50 px-2 py-0.5 text-[10px] text-amber">
                Partial run
              </span>
            )}
          </div>
          <CardDescription className="font-mono text-[10px]">
            {experiment.experiment_id} · job {experiment.job_id}
          </CardDescription>
        </div>
        <div className="text-right text-[10px] text-haze">
          <div>{formatCount(metrics.n_trials)} trial{metrics.n_trials === 1 ? '' : 's'}</div>
          {Array.isArray(frameRefs) && <div>{frameRefs.length} frames</div>}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Recall"
          value={formatPercent(metrics.recall, 0)}
          hint={
            recall
              ? `95% interval ${formatPercent(recall[0], 0)}–${formatPercent(recall[1], 0)}`
              : `${metrics.n_recovered_truth ?? 0} of ${metrics.n_truth_total ?? 0} recovered`
          }
        />
        <Stat
          label="Precision"
          value={formatPercent(metrics.precision, 0)}
          hint={
            precision
              ? `95% interval ${formatPercent(precision[0], 0)}–${formatPercent(precision[1], 0)}`
              : 'Measured against injected sources'
          }
        />
        <Stat
          label="Position error"
          value={formatArcsec(metrics.position_error.median_px, 2).replace('″', '')}
          hint={`median px · p90 ${metrics.position_error.p90_px.toFixed(2)} px · n ${metrics.position_error.n}`}
        />
        <Stat
          label="Detections"
          value={formatCount(metrics.n_detections_total ?? 0)}
          hint={`${formatCount(metrics.n_missed_truth)} missed · ${formatCount(
            metrics.n_spurious_detections,
          )} spurious`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[12px] font-semibold">Completeness vs brightness (SNR)</h3>
          <CompletenessChart bins={metrics.completeness_flux} xLabel="SNR" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[12px] font-semibold">Completeness vs speed</h3>
          <CompletenessChart
            bins={metrics.completeness_speed}
            xLabel="arcsec/day"
            color="#f5b942"
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-[11px]">
            <caption className="sr-only">Outcome classes for this experiment</caption>
            <thead className="bg-bar text-haze">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-medium">Outcome</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Truth</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">Detections</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Recovered', metrics.n_recovered_truth, metrics.n_recovered_detections ?? 0],
                ['Missed', metrics.n_missed_truth, 0],
                ['Preexisting', metrics.n_preexisting_truth, metrics.n_preexisting_detections ?? 0],
                ['Spurious', 0, metrics.n_spurious_detections],
              ].map(([label, truth, detections]) => (
                <tr key={label as string} className="border-t border-line/70">
                  <td className="px-2 py-1.5 text-mist">{label}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatCount(truth as number)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{formatCount(detections as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-line bg-bar p-3">
          <h3 className="m-0 mb-2 text-[12px] font-semibold">Parameters</h3>
          <ParameterList experiment={experiment} />
        </div>
      </div>

      <p className="m-0 text-[11px] text-haze">
        Results apply to this experiment only. Precision is measured against the sources injected
        in this experiment.
      </p>
    </Card>
  );
}

export function MethodsPage() {
  const { values } = useUrlState();
  const navigate = useNavigate();
  const preserve = useSearchPreservingPath();
  const queryClient = useQueryClient();
  const fieldId = values.f;
  const field = useField(fieldId);
  const experiments = useExperiments(fieldId);
  const methods = useMethods();
  const releases = useReleases();
  const capabilities = useCapabilities();
  const presets = usePresets();
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const experimentList = experiments.data?.data.experiments ?? [];

  useEffect(() => {
    if (experimentList.length === 0) {
      setSelectedExperiment(null);
      return;
    }
    if (!experimentList.some((experiment) => experiment.experiment_id === selectedExperiment)) {
      setSelectedExperiment(experimentList[0].experiment_id);
    }
  }, [experimentList, selectedExperiment]);

  const experiment = useMemo(
    () => experimentList.find((item) => item.experiment_id === selectedExperiment) ?? null,
    [experimentList, selectedExperiment],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    SECTIONS.forEach(([id]) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const run = useMutation({
    mutationFn: () => {
      if (!fieldId || !experiment) throw new ApiError('ORB-API-001', 'Choose an experiment first.', 422);
      return api.submitJob({
        kind: 'validation',
        field_id: fieldId,
        params: { ...experiment.params, field_id: fieldId },
      });
    },
    onSuccess: (envelope) => {
      setNotice(
        envelope.meta.replayed
          ? 'Showing results from an earlier identical run.'
          : 'Validation submitted. The status updates as it runs.',
      );
      void queryClient.invalidateQueries({ queryKey: ['jobs', fieldId] });
    },
  });
  const runJob = useJob(run.data?.data.job_id ?? null);

  useEffect(() => {
    if (runJob.data?.data.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: ['experiments', fieldId] });
    }
  }, [fieldId, queryClient, runJob.data?.data.status]);

  const fieldData = field.data?.data;
  const policies = methods.data?.data;
  const model = policies?.model;
  const ranking = capabilities.data?.data.ranking;

  const card =
    'scroll-mt-[88px] rounded-2xl border border-line bg-panel p-5 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:m-0';

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">
            Methods and limits
          </div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight">How the search works</h1>
          <p className="m-0 max-w-3xl text-[14px] leading-relaxed text-mist">
            What the pipeline does, what the validation numbers cover, and what this tool cannot
            claim.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-teal/50 px-2.5 py-1 text-[11px] text-teal">
          Research notes
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="On this page"
          className="flex h-max gap-1 overflow-x-auto rounded-xl border border-line bg-bar p-3 max-lg:sticky max-lg:top-0 max-lg:z-10 lg:flex-col lg:sticky lg:top-4"
        >
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'block whitespace-nowrap border-l-2 px-2 py-2 text-[12px] no-underline',
                active === id
                  ? 'border-amber bg-amber/10 text-amber'
                  : 'border-transparent text-haze hover:text-ink',
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          <article id="what" className={card}>
            <h2>What ORBITALIS does</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mist">
              ORBITALIS retrieves a repeated SPHEREx image series for one field, checks data
              quality, prepares the observations for comparison, and searches possible motion paths.
              A <b className="text-ink">shift-and-stack</b> aligns observations along a guessed path
              and combines them, so a faint mover can stand out for human review.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-mist">
              Every result is a candidate. The tool shows the combined image beside the original
              frames so a person can inspect the evidence; it does not confirm anything.
            </p>
          </article>

          <article id="data" className={card}>
            <h2>Data &amp; preparation</h2>
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Stat
                  label="Field"
                  value={
                    fieldData ? (
                      <span className="text-sm">{fieldData.field_id}</span>
                    ) : (
                      <span className="text-sm text-haze">No field selected</span>
                    )
                  }
                  hint={
                    fieldData
                      ? `${fieldData.params.ra.toFixed(4)}°, ${fieldData.params.dec.toFixed(
                          4,
                        )}° · r ${fieldData.params.radius_deg}° · ${formatRelease(
                          fieldData.params.release,
                        )}`
                      : 'Open a preset in the Explorer to load a field.'
                  }
                />
                <Stat
                  label="Releases"
                  value={
                    <span className="text-sm">
                      {(releases.data?.data.releases ?? [])
                        .filter((release) => release.enabled)
                        .map((release) => release.id.toUpperCase())
                        .join(' · ') || '—'}
                    </span>
                  }
                  hint={(releases.data?.data.releases ?? [])
                    .filter((release) => release.enabled)
                    .map((release) => release.label)
                    .join(' · ')}
                />
              </div>

              {policies ? (
                <div className="rounded-xl border border-line bg-bar p-3">
                  <h3 className="m-0 mb-2 text-[12px] font-semibold">Stack policy</h3>
                  <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[11px]">
                    <dt className="text-haze">Same release</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.stack_policy.same_release ? 'Required' : 'Not required'}
                    </dd>
                    <dt className="text-haze">Same detector</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.stack_policy.same_detector ? 'Required' : 'Not required'}
                    </dd>
                    <dt className="text-haze">Epoch gap</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.stack_policy.epoch_gap_days} days
                    </dd>
                    <dt className="text-haze">Maximum time span</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.stack_policy.max_time_span_days} days
                    </dd>
                    <dt className="text-haze">Maximum wavelength span</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.stack_policy.max_wavelength_span_um} µm
                    </dd>
                    <dt className="text-haze">Masked except</dt>
                    <dd className="m-0 font-mono text-mist">
                      {policies.flag_policy.masked_except.join(', ')}
                    </dd>
                  </dl>
                  <p className="m-0 mt-2 text-[11px] leading-snug text-haze">
                    {policies.flag_policy.note}
                  </p>
                </div>
              ) : (
                <p className="m-0 text-[12px] text-haze">Loading the stack policy…</p>
              )}
            </div>
          </article>

          <article id="validation" className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2>Validation</h2>
                <p className="text-[12px] text-haze">
                  Injection-and-recovery experiments on this field. Results apply to this experiment
                  only.
                </p>
              </div>
              <FlaskConical className="size-5 text-amber" aria-hidden="true" />
            </div>

            {!fieldId && (
              <div className="mt-3 rounded-xl border border-line bg-bar p-4">
                <p className="text-[13px] text-mist">
                  Validation numbers belong to a field. Open a preset to see its stored experiment.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(presets.data?.data.presets ?? []).slice(0, 4).map((preset) => (
                    <Button key={preset.name} variant="outline" size="sm" asChild>
                      <Link
                        to={{
                          pathname: '/',
                          search: `?ra=${preset.ra}&dec=${preset.dec}&r=${preset.radius_deg}&rel=${preset.release}`,
                        }}
                      >
                        {preset.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {fieldId && experiments.isLoading && (
              <p className="mt-3 text-[12px] text-haze">Loading experiments…</p>
            )}
            {fieldId && experiments.isError && (
              <div className="mt-3">
                <ErrorNote error={experiments.error} onRetry={() => experiments.refetch()} />
              </div>
            )}

            {fieldId && !experiments.isLoading && !experiments.isError && experimentList.length === 0 && (
              <div className="mt-3 rounded-xl border border-line bg-bar p-4">
                <p className="text-[13px] text-mist">
                  No validation run for this field yet. A validation run needs saved injection
                  settings; run one from an experiment or choose a preset whose bundle includes one.
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => navigate(preserve('/'))}>
                    Back to the Explorer
                  </Button>
                </div>
              </div>
            )}

            {experimentList.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose experiment">
                {experimentList.map((item) => (
                  <Button
                    key={item.experiment_id}
                    variant="pill"
                    size="sm"
                    data-active={item.experiment_id === selectedExperiment}
                    aria-pressed={item.experiment_id === selectedExperiment}
                    onClick={() => setSelectedExperiment(item.experiment_id)}
                  >
                    {typeof item.params.label === 'string' ? item.params.label : item.experiment_id}
                  </Button>
                ))}
              </div>
            )}

            {experiment && (
              <div className="mt-3 flex flex-col gap-3">
                <ExperimentCard experiment={experiment} />

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bar p-3">
                  <Button onClick={() => run.mutate()} disabled={run.isPending}>
                    <FlaskConical className="size-4" aria-hidden="true" />
                    {run.isPending ? 'Submitting…' : 'Run validation with these settings'}
                  </Button>
                  <span className="text-[11px] text-haze">
                    Runs a job on this field; it may take a while.
                  </span>
                  {run.isError && <ErrorNote error={run.error} compact />}
                  {notice && <span className="text-[11px] text-teal">{notice}</span>}
                  {run.data && (
                    <span className="flex items-center gap-2 text-[11px] text-mist">
                      <StatusChip status={runJob.data?.data.status ?? run.data.data.status} />
                      <span className="font-mono">{run.data.data.job_id}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </article>

          <article id="model" className={card}>
            <h2>Model card</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Stat
                label="Ranking"
                value={
                  <span className="text-sm">
                    {ranking?.enabled ? ranking.model_version ?? 'Enabled' : 'Not available'}
                  </span>
                }
                hint={
                  ranking?.enabled
                    ? 'Scores rank candidates for inspection.'
                    : ranking?.reason ?? 'Results are ordered by stack SNR.'
                }
              />
              <Stat
                label="Classification"
                value={
                  <span className="text-sm">
                    {capabilities.data?.data.classification.enabled ? 'Enabled' : 'Not available'}
                  </span>
                }
                hint={
                  capabilities.data?.data.classification.reason ??
                  'Spectra show measurements only.'
                }
              />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-mist">
              A model score is a prediction from a model trained on synthetic sources. It helps rank
              candidates for inspection. It does not settle any candidate and is not a calibrated
              probability.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-mist">
              {model?.available
                ? `Model version ${model.version ?? 'unknown'} is available on this server.`
                : 'No ranking model file is configured on this server, so the queue is ordered by stack SNR.'}
            </p>
          </article>

          <article id="limits" className={card}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber" aria-hidden="true" />
              <h2>Limitations</h2>
            </div>
            <ul className="m-0 mt-3 list-disc pl-5 text-[13px] leading-relaxed text-mist">
              {LIMITS.map((limit) => (
                <li key={limit} className="[&:not(:first-child)]:mt-1.5">
                  {limit}
                </li>
              ))}
            </ul>
          </article>

          <article id="credits" className={card}>
            <h2>Credits</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mist">
              SPHEREx data are provided by NASA and IPAC/IRSA. This interface is a research tool and
              is not affiliated with or endorsed by NASA.
            </p>
            <p className="mt-2 text-[12px] text-haze">
              Releases in use:{' '}
              {(releases.data?.data.releases ?? [])
                .filter((release) => release.enabled)
                .map((release) => `${release.id.toUpperCase()} (${release.label})`)
                .join(' · ') || 'loading'}
              .
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-haze">
              Data release notes and the SDD are maintained outside this interface.
              <a
                href="https://irsa.ipac.caltech.edu/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                IRSA <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
