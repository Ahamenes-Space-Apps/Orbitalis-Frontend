import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import {
  formatArcsec,
  formatDec,
  formatRa,
  formatSigned,
  padId,
} from "@/lib/coords";
import {
  contributions,
  normalizeWeights,
  KNOWN_OBJECT_FACTOR,
} from "@/lib/scoring";
import {
  useCandidate,
  useExplanation,
  useField,
  useRankedCandidates,
} from "@/data/hooks";
import { useUi } from "@/store/useUi";
import { palette } from "@/lib/palette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EpochCutouts } from "@/components/charts/EpochCutouts";
import { MotionPlot } from "@/components/charts/MotionPlot";
import { SpectrumChart } from "@/components/charts/SpectrumChart";
import { NotFoundPage } from "./NotFoundPage";
import { ApiError } from "@/data/api";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
const cardCls =
  "relative h-full rounded-sm  " +
  "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-accent/60";
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect(); // animate once
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out will-change-transform ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

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
    <div className="min-w-[220px] flex-1 px-5 py-[18px]">
      <div className="text-[11px] tracking-widest text-haze">{label}</div>
      <div className="mt-2 font-mono text-[32px] leading-tight">{value}</div>
      <div className="mt-1 text-[13px] text-mist">{sub}</div>
    </div>
  );
}

export function DossierPage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id);

  const select = useUi((s) => s.select);
  const weights = useUi((s) => s.weights);
  const bandRange = useUi((s) => s.bandRange);
  const detail = useCandidate(valid ? id : null);
  const explanation = useExplanation(valid ? id : null);
  const field = useField();
  const { ranked } = useRankedCandidates({ applyFilters: false });

  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (valid) select(id);
  }, [id, valid, select]);

  if (!valid) return <NotFoundPage what="candidate" />;
  if (detail.isError) {
    const notFound =
      detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <NotFoundPage what={`candidate #${padId(id)}`} />
    ) : (
      <div role="alert" className="p-10 text-ink">
        Could not load candidate #{padId(id)}.
      </div>
    );
  }
  if (!detail.data || !field.data) {
    return (
      <div role="status" className="p-10 text-haze">
        Loading candidate #{padId(id)}…
      </div>
    );
  }

  const c = detail.data;
  const f = field.data;
  const scored = ranked.find((r) => r.id === c.id);
  const score = scored?.score ?? 0;
  const rank = scored?.rank;
  const parts = contributions(c.components, weights);
  const nw = normalizeWeights(weights);
  const px = c.displacementArcsec / f.pixelScaleArcsec;
  const pos = c.positions[0];
  const moving = c.cls === "moving";
  const overlap =
    bandRange &&
    c.flaggedBands &&
    c.flaggedBands[0] <= bandRange[1] &&
    c.flaggedBands[1] >= bandRange[0];

  const exportReport = async () => {
    const el = targetRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: palette.field,
        useCORS: true,
        onclone: (doc) => {
          doc.querySelectorAll<HTMLElement>("[data-reveal]").forEach((n) => {
            n.style.opacity = "1";
            n.style.transform = "none";
            n.style.transition = "none";
          });
        },
      });

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const margin = 10;
      const w = 210 - margin * 2; // usable width in mm
      const pageH = 297 - margin * 2; // usable height in mm
      const pxPerMm = canvas.width / w;
      const sliceH = Math.floor(pageH * pxPerMm); // source pixels per page

      for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
        const h = Math.min(sliceH, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = h;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = palette.field;
        ctx.fillRect(0, 0, slice.width, h);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

        if (page > 0) pdf.addPage();
        pdf.setFillColor(13, 13, 13); // dark page background
        pdf.rect(0, 0, 210, 297, "F");
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          margin,
          margin,
          w,
          h / pxPerMm,
        );
      }

      pdf.save(`candidate-${padId(c.id)}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
    }
  };

  return (
    <div
      ref={targetRef}
      // Own background so the PDF is dark like the page, not transparent/white.
      className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 bg-field px-6 pt-7 pb-14"
    >
      {/* data-html2canvas-ignore keeps UI chrome out of the PDF */}
      <Link
        to="/"
        data-html2canvas-ignore
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm no-underline hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sky explorer
      </Link>

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="text-xs font-semibold tracking-[0.14em] text-accent">
            CANDIDATE DOSSIER
          </div>
          <h1 className="m-0 text-[46px] leading-[1.05] font-semibold">
            Candidate #{padId(c.id)}
          </h1>
          <div className="font-mono text-[13px] text-haze">
            RA {formatRa(pos.ra)} · Dec {formatDec(pos.dec)} · field {f.id}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={moving ? "accent" : "secondary"}>
              {moving ? "Moving candidate" : "Variable candidate"}
            </Badge>
            <Badge>
              {c.knownMatch ? "Known object match" : "No catalog match"}
            </Badge>
            <Badge>{c.detections} epochs</Badge>
          </div>
        </div>
        <div className="flex gap-x-10 gap-y-6">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] tracking-widest text-haze">
              PRIORITY SCORE S
            </div>
            <div
              className="font-mono text-[60px] leading-none font-medium text-accent"
              data-testid="score"
            >
              {score.toFixed(2)}
            </div>
            {rank && (
              <div className="font-mono text-xs text-haze">
                rank {rank} of {ranked.length}
              </div>
            )}
          </div>
          {c.motionConfidence !== null && (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] tracking-widest text-haze">
                MOTION CONFIDENCE
              </div>
              <div className="font-mono text-[60px] leading-none font-medium text-accent">
                {Math.round(c.motionConfidence * 100)}%
              </div>
            </div>
          )}
          
        </div>
        
      </section>
<div data-html2canvas-ignore className="flex flex-wrap gap-2.5">
            <Button size="default">Flag for follow-up</Button>
            <Button variant="outline" onClick={exportReport}>
              Export report
            </Button>
          </div>
      <div className="flex items-start gap-3  px-[18px] py-3.5">
        <Info
          className="mt-px size-5 shrink-0 text-accent"
          aria-hidden="true"
        />
        <p className="m-0 text-sm leading-relaxed text-mist">
          This object shows behavior that{" "}
          <strong className="text-ink">warrants investigation</strong>. It is a
          candidate, not a confirmed detection. Independent follow-up
          observations are needed before any claim is made.
        </p>
      </div>

      <section className="flex flex-wrap gap-4" aria-label="Key numbers">
        <Stat
          label="DISPLACEMENT"
          value={formatArcsec(c.displacementArcsec)}
          sub={
            moving
              ? `≈ ${px.toFixed(1)} pixel${px >= 1.05 ? "s" : ""} · epoch 1 to ${f.epochs.length}`
              : "consistent with no motion"
          }
        />
        <Stat
          label="BRIGHTNESS CHANGE"
          value={formatSigned(c.fluxChangePct)}
          sub={
            c.variabilitySigma !== null
              ? `${c.variabilitySigma.toFixed(1)}σ variability`
              : "not significant on its own"
          }
        />
        <Stat
          label="DETECTIONS"
          value={`${c.detections} of ${f.epochs.length}`}
          sub={
            moving
              ? "fits a straight-line track"
              : "position stays within error"
          }
        />
        <Stat
          label="CATALOG MATCH"
          value={c.knownMatch ? "Match" : "None"}
          sub={c.knownMatch ? c.knownMatch.object : "within 10″ in 4 catalogs"}
        />
      </section>

      <section className="flex flex-wrap items-stretch gap-5">
        <Card className="min-w-[320px] flex-[1_1_640px]">
          <div>
            <CardTitle>Epoch cutouts</CardTitle>
            <CardDescription>
              {2 * c.cutout.halfWidthArcsec}″ × {2 * c.cutout.halfWidthArcsec}″
              around the source. The shift is drawn to scale; the dashed ring
              marks where it was at epoch 1.
            </CardDescription>
          </div>
          <EpochCutouts candidate={c} epochs={f.epochs} />
        </Card>
        <Card className="min-w-[320px] flex-[1_1_480px]">
          <div>
            <CardTitle>Sky-plane motion</CardTitle>
            <CardDescription>
              Offset from epoch 1 in arcseconds. Dashed circles are the 1σ
              position error ({c.positionSigmaArcsec.toFixed(2)}″).
            </CardDescription>
          </div>
          <MotionPlot offsets={c.offsetsArcsec} sigma={c.positionSigmaArcsec} />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-mist">
            <span>Rate: ≈ {c.rateArcsecPerYear.toFixed(1)}″ per year</span>
            <span>Epochs: {f.epochs.map((e) => e.offsetLabel).join(", ")}</span>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <CardTitle>Spectrum across 102 bands</CardTitle>
            <CardDescription>
              0.75–5.0 µm, relative flux in arbitrary units against the field
              median.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-mist">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-xs bg-slate"
              />
              Candidate #{padId(c.id)}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-3.5 bg-ink" />
              Field median
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-xs bg-accent"
              />
              {c.flaggedBands
                ? `Flagged bands ${c.flaggedBands[0]}–${c.flaggedBands[1]}`
                : "No flagged bands"}
            </span>
            {bandRange && (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-xs border border-dashed border-accent-2"
                />
                Your range {bandRange[0]}–{bandRange[1]}
              </span>
            )}
          </div>
        </div>
        <SpectrumChart
          spectrum={c.spectrum}
          median={c.medianSpectrum}
          flagged={c.flaggedBands}
          bandRange={bandRange}
        />
        <div className="flex flex-wrap gap-x-10 gap-y-3 pt-1">
          <div>
            <div className="text-[11px] tracking-widest text-haze">
              SPECTRAL ANOMALY S
            </div>
            <div className="mt-1 font-mono text-[22px]">
              {c.components.S.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-widest text-haze">
              FLAGGED WIDTH
            </div>
            <div className="mt-1 font-mono text-[22px]">
              {c.flaggedBands
                ? `${c.flaggedBands[1] - c.flaggedBands[0] + 1} bands`
                : "none"}
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-widest text-haze">
              PEAK DEPARTURE
            </div>
            <div className="mt-1 font-mono text-[22px]">
              {c.peakDepartureSigma.toFixed(1)}σ
            </div>
          </div>
          {bandRange && (
            <div>
              <div className="text-[11px] tracking-widest text-haze">
                YOUR BAND RANGE
              </div>
              <div className="mt-1 font-mono text-[22px]">
                {overlap ? "overlaps flagged" : "no overlap"}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ───────── Lower section: squared cards + scroll reveal ───────── */}
      <section className="flex flex-col gap-5">
        <Reveal>
          <Card className={`${cardCls} min-w-[320px]`}>
            <div>
              <CardTitle>Evidence breakdown</CardTitle>
              <CardDescription>
                S = wM·M + wB·B + wS·S + wT·T. Change the weights on the
                Candidates page.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3.5">
              {parts.map((p) => (
                <div key={p.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {p.name} ({p.key})
                    </span>
                    <span className="font-mono text-xs text-haze">
                      w {p.weight.toFixed(2)} · +{p.contribution.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-none bg-panel-2">
                      <div
                        className="h-1.5 rounded-none"
                        style={{
                          width: `${Math.round(p.value * 100)}%`,
                          background: p.color,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-sm">
                      {p.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-mist">
                  Where the score comes from
                </span>
                <span className="font-mono text-sm">
                  S = {score.toFixed(2)}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="flex h-2.5 overflow-hidden rounded-none bg-panel-2"
              >
                {parts.map((p) => (
                  <div
                    key={p.key}
                    className="h-2.5"
                    style={{
                      width: `${(p.contribution * 100).toFixed(1)}%`,
                      background: p.color,
                    }}
                  />
                ))}
              </div>
              {c.knownMatch && (
                <p className="m-0 text-xs text-haze">
                  Multiplied by {KNOWN_OBJECT_FACTOR} because it matches a known
                  object.
                </p>
              )}
              <p className="m-0 text-xs text-haze">
                Normalised weights: M {nw.M.toFixed(2)}, B {nw.B.toFixed(2)}, S{" "}
                {nw.S.toFixed(2)}, T {nw.T.toFixed(2)}.
              </p>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={100}>
          <Card className={`${cardCls} min-w-[320px]`}>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Why it was prioritized</CardTitle>
              <Badge tone="quiet" className="rounded-sm text-xs">
                AI-written summary
              </Badge>
            </div>
            {explanation.isLoading && (
              <p className="m-0 text-sm text-haze" role="status">
                Writing the summary…
              </p>
            )}
            {explanation.isError && (
              <p className="m-0 text-sm text-ink" role="alert">
                The summary could not be generated. The numbers on this page are
                unaffected.
              </p>
            )}
            {explanation.data && (
              <>
                {explanation.data.text.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    className="m-0 text-[15px] leading-relaxed text-mist"
                  >
                    {para}
                  </p>
                ))}
                <div className="mt-auto rounded-sm border border-line bg-panel-2 px-3.5 py-3 text-xs leading-normal text-mist">
                  {explanation.data.caveat}{" "}
                  <span className="text-haze">
                    Source: {explanation.data.generatedBy}.
                  </span>
                </div>
              </>
            )}
          </Card>
        </Reveal>

        <Reveal delay={200}>
          <Card className={`${cardCls} min-w-[300px]`}>
            <CardTitle>Known-object cross-match</CardTitle>
            <ul className="m-0 flex list-none flex-col p-0">
              {c.crossMatches.map((k) => (
                <li
                  key={k.catalog}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{k.catalog}</span>
                    <span className="text-xs text-haze">{k.kind}</span>
                  </div>
                  <span
                    className={`font-mono text-xs ${k.matched ? "text-accent" : "text-mist"}`}
                  >
                    {k.matched ? (k.detail ?? "match") : "no match < 10″"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-auto text-xs leading-normal text-mist">
              No match is not proof of novelty. Catalogs are incomplete at faint
              magnitudes.
            </p>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}