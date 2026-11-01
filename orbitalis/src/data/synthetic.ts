import { offsetToSky } from '@/lib/coords';
import {
  BAND_COUNT,
  type CandidateDetail,
  type CrossMatch,
  type FieldInfo,
  type KnownMatch,
  type ScoreComponents,
  type StationarySource,
} from './types';

/**
 * Deterministic synthetic validation field, following the project brief:
 * 500 stationary sources, 20 variable sources, 10 moving objects and 1 planted high-interest candidate.
 * Same seed, same sky. Every number here is generated, none comes from SPHEREx.
 */

export const PLANTED_ID = 42;
const SEED = 20261014;
const CENTER = { ra: 163.0175, dec: 57.4697 };
const FOV_ARCMIN = 20;
const HALF_FIELD = (FOV_ARCMIN * 60) / 2;
const PIXEL_SCALE = 6.2;

const MOVING_FIXED: Record<number, { disp: number; flux: number; conf: number }> = {
  17: { disp: 9.4, flux: -0.3, conf: 0.96 },
  108: { disp: 14.2, flux: -1.2, conf: 0.91 },
  231: { disp: 7.8, flux: 0.2, conf: 0.79 },
};
const MOVING_OTHER_IDS = [64, 187, 203, 129, 76, 255, 91];
const KNOWN_IDS = new Set([231, 76]);
const VARIABLE_IDS = [9, 23, 31, 55, 58, 72, 84, 97, 113, 120, 142, 151, 166, 174, 198, 212, 226, 240, 263, 277];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** The field median spectrum, arbitrary units, 102 bands. */
export function baseSpectrum(i: number): number {
  return 0.6 - 0.28 * (i / (BAND_COUNT - 1)) + 0.03 * Math.sin(i * 0.55);
}

export interface SyntheticField {
  field: FieldInfo;
  stationary: StationarySource[];
  candidates: CandidateDetail[];
}

export function generateSyntheticField(seed = SEED): SyntheticField {
  const rnd = mulberry32(seed);
  const range = (a: number, b: number) => a + (b - a) * rnd();
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

  const field: FieldInfo = {
    id: 'SYN-01',
    name: 'Synthetic validation field',
    synthetic: true,
    center: CENTER,
    fovArcmin: FOV_ARCMIN,
    pixelScaleArcsec: PIXEL_SCALE,
    epochs: [
      { id: 1, label: 'Epoch 1', offsetLabel: 'T + 0', daysSinceFirst: 0 },
      { id: 2, label: 'Epoch 2', offsetLabel: 'T + 6 mo', daysSinceFirst: 182 },
      { id: 3, label: 'Epoch 3', offsetLabel: 'T + 12 mo', daysSinceFirst: 365 },
    ],
    counts: { stationary: 500, variable: 20, moving: 10, highInterest: 1 },
  };

  const stationary: StationarySource[] = Array.from({ length: 500 }, (_, i) => {
    const p = offsetToSky(CENTER, range(-HALF_FIELD, HALF_FIELD), range(-HALF_FIELD, HALF_FIELD));
    return { id: `S${String(i + 1).padStart(4, '0')}`, ra: p.ra, dec: p.dec, flux: round(10 ** range(0, 2), 2) };
  });

  const makeSpectrum = (S: number, flagged: [number, number] | null, amp: number, tilt: number) => {
    const spectrum: number[] = [];
    const median: number[] = [];
    for (let i = 0; i < BAND_COUNT; i++) {
      const base = baseSpectrum(i);
      const inFlag = flagged !== null && i + 1 >= flagged[0] && i + 1 <= flagged[1];
      const centre = flagged ? (flagged[0] + flagged[1]) / 2 - 1 : 0;
      const width = flagged ? Math.max(2, (flagged[1] - flagged[0]) / 3) : 1;
      const bump = inFlag ? amp * Math.exp(-(((i - centre) / width) ** 2)) : 0;
      spectrum.push(round(base * (1 + tilt * (i / (BAND_COUNT - 1) - 0.5)) + bump + (rnd() - 0.5) * 0.03, 4));
      median.push(round(base, 4));
    }
    void S;
    return { spectrum, median };
  };

  const crossMatches = (known: KnownMatch | null): CrossMatch[] => [
    {
      catalog: 'JPL Horizons and SkyBoT',
      kind: 'Solar-system objects',
      matched: known !== null,
      detail: known ? `${known.object}, ${known.separationArcsec.toFixed(1)}″ away` : undefined,
    },
    { catalog: 'Gaia DR3', kind: 'Stars and proper motions', matched: false },
    { catalog: 'WISE', kind: 'Infrared sources', matched: false },
    { catalog: 'SIMBAD', kind: 'All object types', matched: false },
  ];

  const candidates: CandidateDetail[] = [];

  const buildCandidate = (opts: {
    id: number;
    cls: 'moving' | 'variable';
    start: { dx: number; dy: number };
    offsets: { dx: number; dy: number }[];
    flux: number;
    conf: number | null;
    sigma: number;
    components: Omit<ScoreComponents, 'M'> & { M?: number };
    flagged: [number, number] | null;
    amp: number;
    peak: number;
    known: boolean;
    truth: CandidateDetail['truth'];
  }) => {
    const e3 = opts.offsets[opts.offsets.length - 1];
    const disp = Math.hypot(e3.dx, e3.dy);
    const sig = disp / (opts.sigma * Math.SQRT2);
    const M = opts.components.M ?? clamp01(1 - Math.exp(-sig / 3.5));
    const known: KnownMatch | null = opts.known
      ? {
          catalog: 'JPL Horizons and SkyBoT',
          object: `synthetic asteroid A${opts.id}`,
          separationArcsec: round(range(0.4, 2.2), 1),
        }
      : null;
    const { spectrum, median } = makeSpectrum(opts.components.S, opts.flagged, opts.amp, opts.cls === 'moving' ? range(-0.2, 0.4) : 0);
    const positions = opts.offsets.map((o) => offsetToSky(CENTER, opts.start.dx + o.dx, opts.start.dy + o.dy));

    const mid = { dx: (opts.offsets[0].dx + e3.dx) / 2, dy: (opts.offsets[0].dy + e3.dy) / 2 };
    const half = Math.max(30, Math.ceil((Math.max(...opts.offsets.map((o) => Math.hypot(o.dx - mid.dx, o.dy - mid.dy))) * 2.4) / 10) * 10);
    const stars: { dx: number; dy: number; mag: number }[] = [];
    while (stars.length < 26) {
      const dx = range(-half, half);
      const dy = range(-half, half);
      const near = opts.offsets.some((o) => Math.hypot(dx - (o.dx - mid.dx), dy - (o.dy - mid.dy)) < half * 0.18);
      if (near) continue;
      stars.push({ dx: round(dx, 1), dy: round(dy, 1), mag: round(rnd(), 2) });
    }

    candidates.push({
      id: opts.id,
      cls: opts.cls,
      positions,
      displacementArcsec: round(disp, 2),
      fluxChangePct: opts.flux,
      motionConfidence: opts.conf,
      variabilitySigma: opts.cls === 'variable' ? round(Math.abs(opts.flux) / 1.25, 1) : null,
      components: { M: round(M, 2), B: opts.components.B, S: opts.components.S, T: opts.components.T },
      knownMatch: known,
      flaggedBands: opts.flagged,
      peakDepartureSigma: opts.peak,
      detections: 3,
      positionSigmaArcsec: opts.sigma,
      rateArcsecPerYear: round((disp * 365.25) / 365, 1),
      truth: opts.truth,
      spectrum,
      medianSpectrum: median,
      offsetsArcsec: opts.offsets.map((o) => ({ dx: round(o.dx, 2), dy: round(o.dy, 2) })),
      cutout: { halfWidthArcsec: half, stars },
      crossMatches: crossMatches(known),
    });
  };

  const randomStart = () => ({ dx: range(-HALF_FIELD + 80, HALF_FIELD - 80), dy: range(-HALF_FIELD + 80, HALF_FIELD - 80) });
  const flagFor = (S: number): { flagged: [number, number] | null; amp: number } => {
    if (S < 0.35) return { flagged: null, amp: 0 };
    const w = Math.round(range(6, 12));
    const a = Math.round(range(10, 85));
    return { flagged: [a, a + w], amp: Math.min(0.2, (0.2 * S) / 0.45) };
  };

  // The planted high-interest candidate: small, consistent motion with a spectral anomaly in bands 62 to 74.
  buildCandidate({
    id: PLANTED_ID,
    cls: 'moving',
    start: { dx: -30, dy: 22 },
    offsets: [
      { dx: 0, dy: 0 },
      { dx: 1.7, dy: 0.8 },
      { dx: 3.4, dy: 1.5 },
    ],
    flux: 0.8,
    conf: 0.87,
    sigma: 0.25,
    components: { B: 0.2, S: 0.97, T: 0.96 },
    flagged: [62, 74],
    amp: 0.26,
    peak: 3.4,
    known: false,
    truth: 'planted-high-interest',
  });

  const movingIds = [17, 108, 231, ...MOVING_OTHER_IDS];
  for (const id of movingIds) {
    const fixed = MOVING_FIXED[id];
    const disp = fixed?.disp ?? round(10 ** range(Math.log10(0.9), Math.log10(30)), 1);
    const theta = range(0, 2 * Math.PI);
    const e3 = { dx: disp * Math.cos(theta), dy: disp * Math.sin(theta) };
    const known = KNOWN_IDS.has(id);
    const S = known ? range(0.05, 0.2) : range(0.08, 0.45);
    const { flagged, amp } = flagFor(S);
    buildCandidate({
      id,
      cls: 'moving',
      start: randomStart(),
      offsets: [
        { dx: 0, dy: 0 },
        { dx: e3.dx * 0.5 + gauss() * 0.15, dy: e3.dy * 0.5 + gauss() * 0.15 },
        e3,
      ],
      flux: fixed?.flux ?? round(gauss() * 1.0, 1),
      conf: fixed?.conf ?? round(range(0.7, 0.98), 2),
      sigma: 0.45,
      components: { B: round(clamp01(Math.abs(fixed?.flux ?? 0.5) / 4), 2), S: round(S, 2), T: round(range(0.75, 0.99), 2) },
      flagged,
      amp,
      peak: flagged ? round(1 + S * 3, 1) : round(0.5 + S, 1),
      known,
      truth: 'planted-moving',
    });
  }

  for (const id of VARIABLE_IDS) {
    const flux = id === 9 ? 6.4 : round((rnd() < 0.5 ? -1 : 1) * range(2.5, 12), 1);
    const S = range(0.1, 0.5);
    const { flagged, amp } = flagFor(S);
    const e3 = id === 9 ? { dx: 0.2, dy: 0.22 } : { dx: gauss() * 0.12, dy: gauss() * 0.12 };
    buildCandidate({
      id,
      cls: 'variable',
      start: randomStart(),
      offsets: [{ dx: 0, dy: 0 }, { dx: e3.dx * 0.5, dy: e3.dy * 0.5 }, e3],
      flux,
      conf: null,
      sigma: 0.45,
      components: { B: round(clamp01(Math.abs(flux) / 4), 2), S: round(S, 2), T: round(range(0.55, 0.9), 2) },
      flagged,
      amp,
      peak: flagged ? round(1 + S * 3, 1) : round(0.5 + S, 1),
      known: false,
      truth: 'planted-variable',
    });
  }

  candidates.sort((a, b) => a.id - b.id);
  return { field, stationary, candidates };
}

let cache: SyntheticField | null = null;
export function getSyntheticField(): SyntheticField {
  if (!cache) cache = generateSyntheticField();
  return cache;
}
