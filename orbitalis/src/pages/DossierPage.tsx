import { useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Info } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { useCandidate, useCapabilities, useField } from '@/data/hooks';
import { ApiError } from '@/data/errors';
import { useUrlState } from '@/state/urlState';
import {
  formatArcsec,
  formatDec,
  formatId,
  formatMjdDate,
  formatPositionAngle,
  formatRa,
  formatRate,
  formatRelease,
  formatScore,
  formatSnr,
} from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorNote } from '@/components/common/ErrorNote';
import { CandidateDrawer } from '@/components/explorer/CandidateDrawer';
import { NotFoundPage } from './NotFoundPage';

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="min-w-[200px] flex-1 rounded-2xl border border-line bg-panel px-5 py-[18px]">
      <div className="text-[11px] tracking-widest text-haze">{label}</div>
      <div className="mt-2 font-mono text-[30px] leading-tight">{value}</div>
      <div className="mt-1 text-[13px] text-mist">{sub}</div>
    </div>
  );
}

function motionRate(candidate: {
  motion: { mu_e_arcsec_per_day: number; mu_n_arcsec_per_day: number };
}) {
  const rate = Math.hypot(
    candidate.motion.mu_e_arcsec_per_day,
    candidate.motion.mu_n_arcsec_per_day,
  );
  const angle =
    (Math.atan2(candidate.motion.mu_e_arcsec_per_day, candidate.motion.mu_n_arcsec_per_day) *
      180) /
    Math.PI;
  return { rate, angle };
}

export function DossierPage() {
  const { id } = useParams();
  const candidateId = id ?? null;
  const { values } = useUrlState();
  const detail = useCandidate(candidateId);
  const candidate = detail.data?.data;

  const fieldId = values.f ?? candidate?.field_id ?? null;
  const field = useField(fieldId);
  const capabilities = useCapabilities();
  const rankingEnabled = Boolean(capabilities.data?.data.ranking.enabled);

  const targetRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(() => {
    if (!candidate) return null;
    const frames = [...candidate.frames].sort((a, b) => a.mjd - b.mjd);
    const baseline = frames.length > 1 ? frames[frames.length - 1].mjd - frames[0].mjd : 0;
    const { rate, angle } = motionRate(candidate);
    const shiftArcsec = rate * baseline;
    const pixelScale = field.data?.data.grid.pixel_scale_arcsec ?? 0;
    return {
      baseline,
      rate,
      angle,
      shiftArcsec,
      shiftPx: pixelScale > 0 ? shiftArcsec / pixelScale : null,
      frames,
    };
  }, [candidate, field.data]);

  const exportReport = async () => {
    const element = targetRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#080d19',
        useCORS: true,
      });

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const margin = 10;
      const width = 210 - margin * 2;
      const pageHeight = 297 - margin * 2;
      const pxPerMm = canvas.width / width;
      const sliceHeight = Math.floor(pageHeight * pxPerMm);

      for (let y = 0, page = 0; y < canvas.height; y += sliceHeight, page += 1) {
        const height = Math.min(sliceHeight, canvas.height - y);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = height;
        const context = slice.getContext('2d');
        if (!context) throw new Error('Could not build the PDF canvas.');
        context.fillStyle = '#080d19';
        context.fillRect(0, 0, slice.width, height);
        context.drawImage(canvas, 0, y, canvas.width, height, 0, 0, canvas.width, height);

        if (page > 0) pdf.addPage();
        pdf.setFillColor(8, 13, 25);
        pdf.rect(0, 0, 210, 297, 'F');
        pdf.addImage(
          slice.toDataURL('image/jpeg', 0.92),
          'JPEG',
          margin,
          margin,
          width,
          height / pxPerMm,
        );
      }

      pdf.save(`candidate-${candidate?.ordinal ?? 'dossier'}.pdf`);
    } catch (error) {
      console.error('PDF export failed', error);
    }
  };

  if (!candidateId) return <NotFoundPage what="candidate" />;

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <NotFoundPage what="candidate" />
    ) : (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <ErrorNote error={detail.error} onRetry={() => detail.refetch()} />
      </div>
    );
  }

  const fieldData = field.data?.data;

  if (!candidate || !fieldData || !metrics) {
    return (
      <div role="status" className="mx-auto max-w-3xl px-6 py-10 text-sm text-haze">
        Loading the candidate dossier…
      </div>
    );
  }

  const moving = !candidate.static_source;
  const frameCount = metrics.frames.length;
  const mission = fieldData.params.preset ? 'preset field' : 'field';

  return (
    <div
      ref={targetRef}
      className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 bg-[#080d19] px-6 pt-7 pb-14"
    >
      <Link
        to={{ pathname: '/', search: values.f ? `?f=${encodeURIComponent(values.f)}` : '' }}
        data-html2canvas-ignore
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm no-underline hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sky explorer
      </Link>

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="text-xs font-semibold tracking-[0.14em] text-amber">
            CANDIDATE DOSSIER
          </div>
          <h1 className="m-0 text-[46px] leading-[1.05] font-semibold">
            Candidate {formatId(candidate.ordinal)}
          </h1>
          <div className="font-mono text-[13px] text-haze">
            RA {formatRa(candidate.position.ra)} · Dec {formatDec(candidate.position.dec)} ·{' '}
            {mission} {fieldData.field_id}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="amber">Unconfirmed</Badge>
            <Badge tone={moving ? 'violet' : 'neutral'}>
              {moving ? 'Moving candidate' : 'Static-source flag'}
            </Badge>
            <Badge>{frameCount} frames on track</Badge>
            <Badge>{formatRelease(fieldData.params.release)}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] tracking-widest text-haze">
              {candidate.rank_value.basis === 'model_score' ? 'MODEL SCORE' : 'STACK SNR'}
            </div>
            <div className="font-mono text-[56px] leading-none font-medium text-amber">
              {candidate.rank_value.basis === 'model_score'
                ? formatScore(candidate.rank_value.value)
                : formatSnr(candidate.rank_value.value)}
            </div>
            <div className="font-mono text-xs text-haze">
              ranked by {candidate.rank_value.basis === 'model_score' ? 'model score' : 'stack SNR'}
            </div>
          </div>
          <div data-html2canvas-ignore className="flex flex-wrap gap-2.5">
            <Button variant="outline" onClick={() => void exportReport()}>
              <Download className="size-4" aria-hidden="true" />
              Export report
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-line-2 bg-panel-2 px-[18px] py-3.5">
        <Info className="mt-px size-5 shrink-0 text-amber" aria-hidden="true" />
        <p className="m-0 text-sm leading-relaxed text-[#cbd3e4]">
          This object shows behaviour that{' '}
          <strong className="text-ink">warrants investigation</strong>. It is a candidate, not a
          detection. Independent follow-up observations are needed before any claim is made.
        </p>
      </div>

      <section className="flex flex-wrap gap-4" aria-label="Key numbers">
        <Stat
          label="STACK SNR"
          value={formatSnr(candidate.stack_snr)}
          sub="combined-image significance along this path"
        />
        <Stat
          label="MOTION"
          value={formatRate(metrics.rate)}
          sub={formatPositionAngle(metrics.angle)}
        />
        <Stat
          label="BASELINE"
          value={`${metrics.baseline.toFixed(1)} days`}
          sub={`${frameCount} frame${frameCount === 1 ? '' : 's'} on track`}
        />
        <Stat
          label="SHIFT OVER BASELINE"
          value={formatArcsec(metrics.shiftArcsec)}
          sub={
            metrics.shiftPx === null
              ? 'pixel scale unavailable'
              : `≈ ${metrics.shiftPx.toFixed(1)} pixels at ${fieldData.grid.pixel_scale_arcsec}″/px`
          }
        />
        {rankingEnabled && candidate.model_score && (
          <Stat
            label="MODEL SCORE"
            value={formatScore(candidate.model_score.value)}
            sub={`prediction · ${candidate.model_score.model_version}`}
          />
        )}
      </section>

      <CandidateDrawer
        candidateId={candidate.candidate_id}
        field={fieldData}
        variant="pane"
        hideHeader
        className="w-full rounded-2xl border border-line bg-panel"
      />

      <section className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 rounded-xl border border-line bg-panel px-[18px] py-4">
        <div>
          <h2 className="m-0 text-[13px] font-semibold">Provenance and limits</h2>
          <p className="m-0 mt-1 text-[12px] leading-relaxed text-haze">
            Stored results from the {mission} {fieldData.field_id} · reference MJD{' '}
            {candidate.reference_mjd} · job {candidate.job_id}.
            {metrics.frames.length > 0
              ? ` Frames span ${formatMjdDate(metrics.frames[0].mjd)} to ${formatMjdDate(
                  metrics.frames[metrics.frames.length - 1].mjd,
                )}.`
              : ''}{' '}
            Flux and SED values are quick-look, not calibrated. Candidates are unconfirmed.
          </p>
        </div>
      </section>
    </div>
  );
}
