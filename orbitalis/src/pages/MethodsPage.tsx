import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  ['what', 'What ORBITALIS does'],
  ['data', 'Data & preparation'],
  ['validation', 'Validation'],
  ['model', 'Model card'],
  ['limits', 'Limitations'],
] as const;

const STATS = [
  ['Recall', '0.91', 'Recovered injected sources'],
  ['Precision', '0.88', 'Measured against injected sources'],
  ['Completeness', '0.84', 'For this experiment'],
];

const LIMITATIONS = [
  'Real-data detections that match nothing known remain candidates, not errors.',
  'Real shifts may be smaller than a pixel; displayed motion can be exaggerated and must be labelled.',
  'Optional features such as spectral classification depend on available data and capabilities.',
  'Human review of original observations is essential before drawing conclusions.',
];

const card =
  'scroll-mt-[82px] rounded-[11px] border border-[#26324d] bg-[#0c1220] p-5 leading-[1.65] [&_h2]:mb-[7px] [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-2.5';

export function MethodsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function runValidation() {
    setToast('Validation run queued in this prototype');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2300);
  }

  return (
    <div className="min-h-screen bg-[#080d19] px-5 pt-[18px] pb-7 text-sm text-[#e8ecf6] max-sm:px-2.5">
      <div className="mx-auto w-full max-w-[1900px]">
        <div className="mt-2 mb-[18px] flex items-start justify-between gap-5 max-sm:flex-col">
          <div>
            <h1 className="m-0 mb-1.5 text-2xl font-semibold tracking-[-0.02em]">Methods &amp; limits</h1>
            <div className="text-xs leading-normal text-[#9aa3b8]">
              How the search works, what the validation numbers mean, and where the method can fail.
            </div>
          </div>
          <span className="whitespace-nowrap rounded-full bg-[#10392f] px-[9px] py-1 text-[11px] text-[#7ce5bd]">
            Research notes
          </span>
        </div>

        <div className="grid gap-[15px] lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="On this page"
            className="h-max rounded-[11px] border border-[#26324d] bg-[#0c1220] p-[15px] max-lg:flex max-lg:gap-1.5 max-lg:overflow-x-auto lg:sticky lg:top-[82px]"
          >
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? 'true' : undefined}
                className={`block whitespace-nowrap border-l-2 px-2 py-[9px] text-xs no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69a9ff] ${
                  active === id
                    ? 'border-[#5aa0ff] bg-[#17305a66] text-[#dcecff]'
                    : 'border-transparent text-[#9aa3b8] hover:text-[#e8ecf6]'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="grid min-w-0 gap-[13px]">
            <article id="what" className={card}>
              <h2>What ORBITALIS does</h2>
              <p>
                ORBITALIS helps inspect astronomical observations for possible moving objects. It retrieves an image
                series, checks data quality, prepares observations for comparison, and displays candidate paths for
                human review.
              </p>
              <p>
                <b>Shift-and-stack</b> aligns observations along a possible motion path and combines them. A source
                that moves consistently may become easier to inspect in the combined image.
              </p>
            </article>

            <article id="data" className={card}>
              <h2>Data &amp; preparation</h2>
              <p>
                <b>Current release:</b> QR2 · <b>Field:</b> Synthetic validation field.
              </p>
              <p>
                Image flags and stack policy determine which pixels and observations are included. Original frames
                remain available beside every stacked result; a combined image should never replace the evidence it
                came from.
              </p>
            </article>

            <article id="validation" className={card}>
              <h2>Validation</h2>
              <p>
                Validation uses synthetic sources injected with known positions and brightness. Metrics apply to the
                selected experiment only.
              </p>
              <div className="my-3.5 grid gap-2.5 sm:grid-cols-3">
                {STATS.map(([label, value, note]) => (
                  <div key={label} className="rounded-[9px] border border-[#293752] bg-[#111b30] p-[13px]">
                    <span className="text-[11px] text-[#9aa3b8]">{label}</span>
                    <strong className="my-1 block text-[22px]">{value}</strong>
                    <span className="text-[11px] text-[#9aa3b8]">{note}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-normal text-[#9aa3b8]">
                Results apply to this experiment only. These illustrative values are demo content, not a live
                validation run.
              </p>
              <button
                type="button"
                onClick={runValidation}
                className="cursor-pointer rounded-lg border border-[#4388ef] bg-[#1555bb] px-3.5 py-[9px] text-xs text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69a9ff]"
              >
                Run validation
              </button>
            </article>

            <article id="model" className={card}>
              <h2>Model card</h2>
              <p>
                <b>Version:</b> cnn-0.1 · <b>Intended use:</b> prioritise candidates for inspection.
              </p>
              <p>
                The model score is a prediction from a model trained on synthetic sources. It helps rank candidates
                for inspection; it does not confirm an object or represent calibrated confidence.
              </p>
            </article>

            <article id="limits" className={card}>
              <h2>Limitations</h2>
              <ul className="m-0 list-disc pl-[18px]">
                {LIMITATIONS.map((l) => (
                  <li key={l} className="[&:not(:first-child)]:mt-1.5">
                    {l}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-20 rounded-[9px] border border-[#3c5a86] bg-[#14233c] px-4 py-3 text-[#eaf2ff] shadow-[0_10px_30px_#0008]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}