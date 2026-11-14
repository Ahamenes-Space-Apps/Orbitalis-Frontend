/**
 * The ORBITALIS API contract, as used by the frontend.
 *
 * Response bodies are not described by the generated `openapi.d.ts` (the
 * backend returns generic objects), so this file is the single hand-written
 * description of the payloads defined in SDD §8.2/§8.2b. Keep it in sync with
 * the SDD and with `openapi.json` request schemas.
 */

export type IsoTimestamp = string;

export interface Envelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    detail: unknown;
  };
}

export type FieldStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobStatus = FieldStatus;
export type RankBasis = 'model_score' | 'stack_snr';

export interface SkyPosition {
  ra: number;
  dec: number;
  kind?: 'candidate' | 'observed' | 'predicted' | string;
}

export interface Grid {
  ra: number;
  dec: number;
  pixel_scale_arcsec: number;
  rotation_deg: number;
  width: number;
  height: number;
}

export interface FieldParams {
  ra: number;
  dec: number;
  radius_deg: number;
  release: string;
  preset: boolean;
  detectors?: number[];
  mjd_start?: number | null;
  mjd_end?: number | null;
}

export interface Field {
  field_id: string;
  status: FieldStatus;
  params: FieldParams;
  grid: Grid;
  frames_done: number;
  error_code: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface FrameStretch {
  lo: number;
  hi: number;
  softness: number;
  lo_percentile: number;
  hi_percentile: number;
  n_pixels: number;
}

export interface FrameMeta {
  mjd?: number;
  mjd_start?: number | null;
  mjd_end?: number | null;
  wavelength_um?: number;
  detector?: number;
  release?: string;
  bandpass?: string;
  bandwidth_um?: number;
  pixel_scale_arcsec?: number;
  display?: string;
  background_level_mjy_sr?: number;
  stretch?: FrameStretch;
  provenance_version?: string;
  obs_id?: string;
  [key: string]: unknown;
}

export interface Frame {
  frame_ref: string;
  field_id: string;
  wavelength_um: number;
  mjd: number;
  detector: number;
  release: string;
  has_png: boolean;
  meta: FrameMeta;
}

export interface ModelScore {
  value: number;
  model_version: string;
  kind: 'model_prediction';
}

export interface RankValue {
  value: number;
  basis: RankBasis;
}

export interface Motion {
  mu_e_arcsec_per_day: number;
  mu_n_arcsec_per_day: number;
}

export interface CandidateSummary {
  candidate_id: string;
  status: 'unconfirmed';
  position: SkyPosition;
  motion: Motion;
  stack_snr: number;
  model_score: ModelScore | null;
  rank_value: RankValue;
  ordinal: number | null;
  background_variant?: string | null;
  snr_calibrated?: boolean;
  predicted_category?: string | null;
  static_source?: boolean;
  created_at?: IsoTimestamp;
}

export interface CandidateExtraction {
  background_variant?: string | null;
  diagnostic?: string | null;
  edge_margin_px?: number;
  method?: string;
  nms_radius_px?: number;
  provisional?: boolean;
  score_sigma_estimate?: number;
  score_threshold?: number;
  threshold_sigma?: number;
  [key: string]: unknown;
}

export interface StaticSourceFlag {
  baseline_days?: number;
  best_trial_is_zero_motion?: boolean;
  detected_fraction?: number;
  detected_in_frames?: number;
  flagged_static_source?: boolean;
  heuristic?: string;
  max_displacement_px?: number;
  min_frame_fraction?: number;
  provisional?: boolean;
  total_frames?: number;
  winning_displacement_px?: number;
  zero_motion_trial_index?: number;
  [key: string]: unknown;
}

export interface CandidateFrame {
  frame_ref: string;
  mjd: number;
  wavelength_um: number;
  detector: number;
  predicted_x?: number | null;
  predicted_y?: number | null;
  predicted_ra?: number | null;
  predicted_dec?: number | null;
  centroid_x?: number | null;
  centroid_y?: number | null;
  peak_x?: number | null;
  peak_y?: number | null;
  extraction?: CandidateExtraction;
  static_source?: StaticSourceFlag;
}

export interface CandidateDetail extends CandidateSummary {
  job_id: string;
  field_id: string;
  reference_mjd: number;
  frames: CandidateFrame[];
}

export interface CandidateFrameList {
  frames: CandidateFrame[];
}

export interface LightcurvePoint {
  frame_ref: string;
  mjd: number;
  wavelength_um: number;
  detector: number;
  x: number | null;
  y: number | null;
  ra: number | null;
  dec: number | null;
  predicted_x?: number | null;
  predicted_y?: number | null;
  flux_mjy: number;
  flux_err_mjy: number;
  upper_limit_mjy: number;
  snr: number;
  detected: boolean;
  aperture_coverage: number;
  background_mjy_sr?: number;
}

export interface LightcurveMethod {
  kind: 'fixed' | 'candidate';
  centroid_radius_px: number;
  aperture_radius_px: number;
  annulus_px: [number, number];
  min_snr: number;
  min_aperture_coverage: number;
  upper_limit_sigma: number;
  note: string;
  calibrated: false;
}

export interface CandidateLightcurveReference {
  candidate_id: string;
  position: { ra: number; dec: number };
  reference_mjd: number | null;
  motion: Motion;
}

export interface FixedLightcurveReference {
  ra: number;
  dec: number;
}

export interface Lightcurve {
  kind: 'fixed' | 'candidate';
  reference: CandidateLightcurveReference | FixedLightcurveReference;
  method: LightcurveMethod;
  points: LightcurvePoint[];
}

export interface SpectrumPoint {
  wavelength_um: number;
  flux: number;
  flux_err?: number | null;
  unit?: string;
  frame_ref?: string;
}

export type Spectrum =
  | { status: 'insufficient_data'; reason: string; points: null }
  | { status: 'ok'; points: SpectrumPoint[]; [key: string]: unknown }
  | { status: string; reason?: string; points: SpectrumPoint[] | null };

export interface OverlayItem {
  id: string;
  name: string;
  type: string;
  ra: number | null;
  dec: number | null;
  path?: Array<{ mjd: number; ra: number; dec: number }> | null;
  shape?: HypothesisShape | null;
  contains_field?: boolean | null;
  citation?: string | null;
  as_of?: string | null;
  detail?: string | null;
}

export interface BoxShape {
  type: 'box';
  ra_min: number;
  ra_max: number;
  dec_min: number;
  dec_max: number;
}

export interface CircleShape {
  type: 'circle';
  ra: number;
  dec: number;
  radius_deg: number;
}

export type HypothesisShape = BoxShape | CircleShape;

export interface Overlay {
  kind: 'known' | 'hypothesis';
  items: OverlayItem[];
  source: string | null;
  as_of: string | null;
}

export interface ExperimentBin {
  lo: number;
  hi: number;
  completeness: number;
  n_injected: number;
  n_recovered: number;
  n_preexisting?: number;
}

export interface PositionError {
  median_px: number;
  p90_px: number;
  max_px: number;
  n: number;
}

export interface ExperimentMetrics {
  recall: number;
  recall_ci_low?: number;
  recall_ci_high?: number;
  recall_ci?: [number, number];
  precision: number;
  precision_ci_low?: number;
  precision_ci_high?: number;
  precision_ci?: [number, number];
  position_error: PositionError;
  completeness_flux: ExperimentBin[];
  completeness_speed: ExperimentBin[];
  n_detections_total?: number;
  n_missed_truth: number;
  n_preexisting_detections?: number;
  n_preexisting_truth: number;
  n_recovered_detections?: number;
  n_recovered_truth: number;
  n_spurious_detections: number;
  n_trials: number;
  n_truth_total?: number;
  partial?: boolean;
  [key: string]: unknown;
}

export interface Experiment {
  experiment_id: string;
  job_id: string;
  field_id: string;
  params: Record<string, unknown>;
  metrics: ExperimentMetrics;
}

export interface JobWarning {
  code: string;
  message: string;
}

export interface JobProgress {
  done: number;
  total: number;
  stage: string;
  warnings?: JobWarning[];
}

export interface JobResult {
  candidate_ids?: string[];
  candidates_found?: number;
  frames_used?: number;
  motion_trials?: number;
  experiment_id?: string;
  [key: string]: unknown;
}

export interface Job {
  job_id: string;
  kind: string;
  field_id: string | null;
  status: JobStatus;
  progress: JobProgress | null;
  result: JobResult | null;
  error_code: string | null;
  error?: { code: string; message: string; detail?: unknown } | null;
  created_at: IsoTimestamp;
  started_at: IsoTimestamp | null;
  finished_at: IsoTimestamp | null;
}

export interface Preset {
  name: string;
  ra: number;
  dec: number;
  radius_deg: number;
  release: string;
  thumbnail_url: string | null;
  why: string;
}

export interface Release {
  id: string;
  label: string;
  enabled: boolean;
}

export interface Health {
  status: 'ok' | 'degraded' | 'offline';
  gateway: { irsa: string };
}

export interface Capabilities {
  ranking: { enabled: boolean; model_version: string | null; reason?: string };
  assistant: { enabled: boolean; reason?: string };
  classification: { enabled: boolean; reason?: string };
  jobs: { max_running: number; queue_max: number; timeout_s: number };
}

export interface Methods {
  stack_policy: {
    same_release: boolean;
    same_detector: boolean;
    epoch_gap_days: number;
    max_time_span_days: number;
    max_wavelength_span_um: number;
  };
  flag_policy: { masked_except: string[]; note: string };
  model: { available: boolean; version?: string | null };
}

export interface Estimate {
  kind: string;
  field_id: string | null;
  work: number;
  budget: number;
  ok: boolean;
  frames: number;
  motion_vectors: number;
}

export interface MotionSearchParams {
  frame_refs: string[] | null;
  frame_window?: {
    n_frames?: number | null;
    mjd_min?: number | null;
    mjd_max?: number | null;
    max_span_days?: number | null;
  } | null;
  rate_arcsec_per_day: [number, number];
  position_angle_deg: [number, number];
  grid_density: 'coarse' | 'normal' | 'fine';
  rank: boolean;
}

export interface JobSubmit {
  kind: string;
  field_id: string | null;
  params: Record<string, unknown>;
}

export interface ChatContext {
  field_id?: string | null;
  frame_ref?: string | null;
  candidate_id?: string | null;
  job_id?: string | null;
  experiment_id?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | null;
}
