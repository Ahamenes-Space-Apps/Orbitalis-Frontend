import type { SkyPos } from '@/lib/coords';

/**
 * The data contract between the pipeline/backend and this frontend.
 * Every type here is what a real backend must return as JSON (see README, "API contract").
 */

export type EpochId = 1 | 2 | 3;

export interface Epoch {
  id: EpochId;
  label: string;
  /** Human label for time since the first pass, e.g. "T + 6 mo". */
  offsetLabel: string;
  daysSinceFirst: number;
}

export interface FieldInfo {
  id: string;
  name: string;
  /** True when the field is generated rather than observed. The UI shows this prominently. */
  synthetic: boolean;
  center: SkyPos;
  /** Field of view of the square field, in arcminutes. */
  fovArcmin: number;
  pixelScaleArcsec: number;
  epochs: Epoch[];
  counts: { stationary: number; variable: number; moving: number; highInterest: number };
}

export interface StationarySource {
  id: string;
  ra: number;
  dec: number;
  flux: number;
}

export type CandidateClass = 'moving' | 'variable';

export interface ScoreComponents {
  /** Motion significance, 0 to 1. */
  M: number;
  /** Brightness variation, 0 to 1. */
  B: number;
  /** Spectral anomaly, 0 to 1. */
  S: number;
  /** Temporal consistency, 0 to 1. */
  T: number;
}

export interface KnownMatch {
  catalog: string;
  object: string;
  separationArcsec: number;
}

export interface CandidateSummary {
  id: number;
  cls: CandidateClass;
  /** One position per epoch (ICRS). */
  positions: SkyPos[];
  /** Total displacement from epoch 1 to the last epoch, arcseconds. */
  displacementArcsec: number;
  /** Percent change in flux from epoch 1 to the last epoch. */
  fluxChangePct: number;
  /** 0 to 1 for moving candidates, null when not applicable. */
  motionConfidence: number | null;
  /** Significance of the flux change in sigma, for variable candidates. */
  variabilitySigma: number | null;
  components: ScoreComponents;
  knownMatch: KnownMatch | null;
  /** 1-indexed inclusive band range where the spectrum departs from the field median. */
  flaggedBands: [number, number] | null;
  peakDepartureSigma: number;
  detections: number;
  positionSigmaArcsec: number;
  rateArcsecPerYear: number;
  /** Ground truth, only available on synthetic fields. */
  truth: 'planted-high-interest' | 'planted-moving' | 'planted-variable' | null;
}

export interface CrossMatch {
  catalog: string;
  kind: string;
  matched: boolean;
  detail?: string;
}

export interface CandidateDetail extends CandidateSummary {
  /** 102 values, relative flux (arbitrary units). */
  spectrum: number[];
  /** 102 values, the field median spectrum on the same scale. */
  medianSpectrum: number[];
  /** Offsets from the epoch 1 position, arcseconds. dx is ΔRA·cos(dec). */
  offsetsArcsec: { dx: number; dy: number }[];
  cutout: {
    halfWidthArcsec: number;
    stars: { dx: number; dy: number; mag: number }[];
  };
  crossMatches: CrossMatch[];
}

export interface Explanation {
  text: string;
  caveat: string;
  /** "template" for the offline mock, otherwise the model name used by the backend. */
  generatedBy: string;
}

export const BAND_COUNT = 102;
export const WAVELENGTH_RANGE_UM: [number, number] = [0.75, 5.0];
