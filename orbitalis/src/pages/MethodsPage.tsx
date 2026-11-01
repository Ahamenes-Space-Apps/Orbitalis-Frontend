import { useField, useRankedCandidates } from '@/data/hooks';
import { usingMockApi } from '@/data/api';
import { padId } from '@/lib/coords';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

const STAGES = [
  ['Ingest', 'Read SPHEREx observations from IRSA, or the synthetic generator, and keep the WCS of every exposure.'],
  ['Register', 'Check that positions agree between epochs, using bright stationary sources as anchors.'],
  ['Extract and match', 'Find sources, measure centroids and fluxes, and match them across epochs.'],
  ['Classify', 'Label each source as stationary, moving, variable, or appearing and disappearing.'],
  ['Score and cross-match', 'Combine four pieces of evidence into S, then compare against known solar-system objects and catalogs.'],
  ['Review', 'A person looks at the candidate, its motion, its spectrum, and decides whether it deserves follow-up.'],
];

const LIMITS = [
  ['Pixels are large.', 'SPHEREx pixels are about 6″ across. A 3.7″ shift is smaller than one pixel, so detection depends on centroid precision and on tracks over several epochs, not on how a blink comparison looks.'],
  ['Wavelength changes across the detector.', 'The same sky position is seen at different wavelengths in different exposures. Epochs are compared source by source, in matched bands, not by subtracting whole images.'],
  ['Most movers are known.', 'In real data, most moving sources will be catalogued asteroids. That is why known objects are cross-matched and ranked lower.'],
  ['No match is not novelty.', 'Catalogs are incomplete at faint magnitudes. An unmatched object is a reason to look, not a finding.'],
  ['A candidate is not a detection.', 'Nothing here confirms a planet, a comet or any other object. Follow-up observations do that.'],
];

const ENDPOINTS = [
  ['GET /api/field', 'Field description: center, size, pixel scale, epochs, counts'],
  ['GET /api/sources?class=stationary', 'Stationary sources (id, ra, dec, flux)'],
  ['GET /api/candidates', 'All candidates, without spectra or cutouts'],
  ['GET /api/candidates/{id}', 'One candidate with 102-band spectrum, offsets, cutout stars, cross-matches'],
  ['GET /api/candidates/{id}/explanation', 'Short text explaining the ranking, written from the candidate record only'],
];

export function MethodsPage() {
  const field = useField();
  const { ranked } = useRankedCandidates({ applyFilters: false });

  const planted = ranked.find((c) => c.truth === 'planted-high-interest');
  const truthMovers = ranked.filter((c) => c.truth === 'planted-moving' || c.truth === 'planted-high-interest');
  const topN = ranked.slice(0, truthMovers.length);
  const moversInTop = topN.filter((c) => c.cls === 'moving').length;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-6 pt-7 pb-14">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-[0.14em] text-amber">METHODS AND LIMITS</div>
        <h1 className="m-0 text-4xl font-semibold">What this tool does, and what it cannot say</h1>
        <p className="m-0 max-w-3xl text-[15px] leading-relaxed text-mist">
          ORBITALIS is an interface for finding objects whose position or brightness changes between repeated sky observations.
          It gives people a faster way to find what deserves to be investigated. It does not decide what an object is.
        </p>
      </div>

      <Card>
        <CardTitle>Pipeline</CardTitle>
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {STAGES.map(([name, text], i) => (
            <li key={name} className="flex gap-3 rounded-xl border border-line bg-panel-2 p-4">
              <span className="font-mono text-sm text-amber">{i + 1}</span>
              <span>
                <span className="block text-[15px] font-semibold">{name}</span>
                <span className="mt-1 block text-[13px] leading-normal text-mist">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardTitle>Limits to keep in mind</CardTitle>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {LIMITS.map(([title, text]) => (
            <li key={title} className="text-[14px] leading-relaxed text-[#d5dbe8]">
              <strong className="text-ink">{title}</strong> {text}
            </li>
          ))}
        </ul>
      </Card>

      <Card data-testid="validation-card">
        <div>
          <CardTitle>Synthetic validation</CardTitle>
          <CardDescription>
            {field.data?.synthetic
              ? 'This field is generated, so the right answers are known. These numbers use your current score weights.'
              : 'Ground truth is only available on synthetic fields.'}
          </CardDescription>
        </div>
        {planted ? (
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <div className="text-[11px] tracking-widest text-haze">PLANTED HIGH-INTEREST OBJECT</div>
              <div className="mt-1 font-mono text-[28px]" data-testid="planted-rank">
                #{padId(planted.id)} ranks {planted.rank} of {ranked.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] tracking-widest text-haze">PLANTED MOVERS IN THE TOP {topN.length}</div>
              <div className="mt-1 font-mono text-[28px]" data-testid="movers-in-top">
                {moversInTop} of {truthMovers.length}
              </div>
            </div>
          </div>
        ) : (
          <p className="m-0 text-sm text-haze">No ground truth is attached to this field.</p>
        )}
        <p className="m-0 text-xs leading-normal text-haze">
          These are checks against data made to be found. They show the ranking works as designed, not how it performs on the real sky.
        </p>
      </Card>

      <Card>
        <div>
          <CardTitle>API contract</CardTitle>
          <CardDescription>
            {usingMockApi
              ? 'You are running on the built-in mock API. Set VITE_API_URL to use a real backend that returns the same JSON.'
              : 'Connected to a backend through VITE_API_URL.'}
          </CardDescription>
        </div>
        <dl className="m-0 flex flex-col">
          {ENDPOINTS.map(([path, text]) => (
            <div key={path} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[#1e2840] py-3 last:border-b-0">
              <dt className="font-mono text-[13px] text-amber">{path}</dt>
              <dd className="m-0 text-[13px] text-mist">{text}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
