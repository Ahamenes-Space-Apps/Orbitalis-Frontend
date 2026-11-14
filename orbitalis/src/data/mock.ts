/**
 * Static mock backend.
 *
 * Serves the checked-in `public/mock/bundle.json` (generated from the offline
 * backend's demo bundle) through the same small interface as the live client.
 * This keeps the screens honest when no backend is running: the "mock API"
 * banner shows, every page is populated from real demo-bundle content, and
 * no network request leaves the browser.
 */

import { ApiError } from './errors';
import type {
  CandidateDetail,
  CandidateFrame,
  CandidateFrameList,
  CandidateSummary,
  Capabilities,
  Estimate,
  Experiment,
  Field,
  Frame,
  Health,
  Job,
  JobStatus,
  JobSubmit,
  Lightcurve,
  Methods,
  MotionSearchParams,
  Overlay,
  Preset,
  Release,
  Spectrum,
} from './types';

interface FieldBundle {
  field_id: string;
  field: Field;
  frames: { frames: Frame[] };
  candidates: { data: { candidates: CandidateSummary[] }; meta: Record<string, unknown> };
  jobs: { jobs: Job[] };
  experiments: { experiments: Experiment[] };
  overlays: { known: Overlay; hypothesis: Overlay };
  field_lightcurve: { data: Lightcurve; meta: Record<string, unknown> };
  spectrum: { data: Spectrum; meta: Record<string, unknown> };
  candidate_details: Record<string, CandidateDetail>;
  candidate_frames: Record<string, CandidateFrame[]>;
  candidate_lightcurves: Record<string, { data: Lightcurve; meta: Record<string, unknown> }>;
}

interface Bundle {
  generated_at: string;
  source: string;
  health: { data: Health; meta: Record<string, unknown> };
  capabilities: { data: Capabilities; meta: Record<string, unknown> };
  presets: { presets: Preset[] } | null;
  releases: { data: { releases: Release[] }; meta: Record<string, unknown> };
  methods: { data: Methods; meta: Record<string, unknown> };
  fields: Record<string, FieldBundle>;
}

let bundlePromise: Promise<Bundle> | null = null;

function loadBundle(): Promise<Bundle> {
  bundlePromise ??= fetch('/mock/bundle.json', { headers: { Accept: 'application/json' } }).then(async (res) => {
    if (!res.ok) throw new ApiError('ORB-SYS-002', 'The demo bundle could not be loaded.', res.status);
    return (await res.json()) as Bundle;
  });
  return bundlePromise;
}

async function findJob(jobId: string): Promise<Job> {
  const bundle = await loadBundle();
  for (const entry of Object.values(bundle.fields)) {
    const found = entry.jobs.jobs.find((item) => item.job_id === jobId);
    if (found) return found;
  }
  throw new ApiError('ORB-API-002', `Job ${jobId} is not in the demo bundle.`, 404);
}

const delayMs = import.meta.env.MODE === 'test' ? 0 : 90;

function wait<T>(value: T): Promise<T> {
  if (delayMs === 0) return Promise.resolve(structuredClone(value));
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(value)), delayMs);
  });
}

function fieldFor(bundle: Bundle, fieldId: string): FieldBundle {
  const found = Object.values(bundle.fields).find((entry) => entry.field_id === fieldId);
  if (!found) throw new ApiError('ORB-API-002', `Field ${fieldId} is not in the demo bundle.`, 404);
  return found;
}

const image = (path: string) => `/mock/images/${path}`;

export const mockApi = {
  async health() {
    const bundle = await loadBundle();
    return bundle.health;
  },

  async capabilities() {
    const bundle = await loadBundle();
    return bundle.capabilities;
  },

  async presets() {
    const bundle = await loadBundle();
    return { data: bundle.presets ?? { presets: [] }, meta: {} };
  },

  async releases() {
    const bundle = await loadBundle();
    return bundle.releases;
  },

  async methods() {
    const bundle = await loadBundle();
    return bundle.methods;
  },

  async createField(body: {
    preset?: string | null;
    ra?: number | null;
    dec?: number | null;
    radius_deg?: number;
    release?: string | null;
  }) {
    const bundle = await loadBundle();
    let key = body.preset ?? null;
    if (!key && body.ra != null && body.dec != null) {
      let best: { key: string; distance: number } | null = null;
      for (const [name, entry] of Object.entries(bundle.fields)) {
        const distance = Math.hypot(entry.field.params.ra - body.ra, entry.field.params.dec - body.dec);
        if (!best || distance < best.distance) best = { key: name, distance };
      }
      if (!best || best.distance > 0.25) {
        throw new ApiError(
          'ORB-MOCK-001',
          'Mock mode contains the six demo presets only. Enter a preset, or point VITE_API_URL at the real backend.',
          422,
        );
      }
      key = best.key;
    }
    const entry = key ? bundle.fields[key] : undefined;
    if (!entry) throw new ApiError('ORB-API-001', 'Choose a preset or a position.', 422);
    const field = structuredClone(entry.field);
    field.params.release = body.release ?? field.params.release;
    return wait({ data: field, meta: { mock: true } });
  },

  async field(fieldId: string) {
    const bundle = await loadBundle();
    return wait({ data: fieldFor(bundle, fieldId).field, meta: {} });
  },

  async frames(fieldId: string) {
    const bundle = await loadBundle();
    return wait({ data: fieldFor(bundle, fieldId).frames, meta: {} });
  },

  async candidates(fieldId: string, sort?: string) {
    const bundle = await loadBundle();
    const entry = fieldFor(bundle, fieldId);
    const candidates = [...entry.candidates.data.candidates];
    const basis = sort === 'model_score' ? 'model_score' : 'stack_snr';
    candidates.sort((a, b) => {
      const av = basis === 'model_score' ? (a.model_score?.value ?? -Infinity) : a.stack_snr;
      const bv = basis === 'model_score' ? (b.model_score?.value ?? -Infinity) : b.stack_snr;
      return bv - av;
    });
    return wait({
      data: { candidates },
      meta: { ...entry.candidates.meta, sorted_by: basis, mock: true },
    });
  },

  async candidate(candidateId: string) {
    const bundle = await loadBundle();
    for (const entry of Object.values(bundle.fields)) {
      const found = entry.candidate_details[candidateId];
      if (found) return wait({ data: found, meta: {} });
    }
    throw new ApiError('ORB-API-002', `Candidate ${candidateId} is not in the demo bundle.`, 404);
  },

  async candidateFrames(candidateId: string) {
    const bundle = await loadBundle();
    for (const entry of Object.values(bundle.fields)) {
      const detail = entry.candidate_details[candidateId];
      if (!detail) continue;
      const frames = entry.candidate_frames[candidateId] ?? detail.frames;
      return wait<{ data: CandidateFrameList; meta: Record<string, unknown> }>({
        data: { frames },
        meta: {},
      });
    }
    throw new ApiError('ORB-API-002', `Candidate ${candidateId} is not in the demo bundle.`, 404);
  },

  async candidateLightcurve(candidateId: string) {
    const bundle = await loadBundle();
    for (const entry of Object.values(bundle.fields)) {
      const found = entry.candidate_lightcurves[candidateId];
      if (found) return wait(found);
      if (entry.candidate_details[candidateId]) {
        return wait({
          data: {
            kind: 'candidate' as const,
            reference: {
              candidate_id: candidateId,
              position: entry.candidate_details[candidateId].position,
              reference_mjd: entry.candidate_details[candidateId].reference_mjd,
              motion: entry.candidate_details[candidateId].motion,
            },
            method: {
              kind: 'candidate' as const,
              centroid_radius_px: 3,
              aperture_radius_px: 2.5,
              annulus_px: [4, 7] as [number, number],
              min_snr: 3,
              min_aperture_coverage: 0.8,
              upper_limit_sigma: 3,
              note: 'quick-look aperture photometry on resampled MJy/sr frames; no aperture correction, not a calibrated light curve',
              calibrated: false as const,
            },
            points: [],
          },
          meta: { frames_measured: 0, frames_skipped: 0 },
        });
      }
    }
    throw new ApiError('ORB-API-002', `Candidate ${candidateId} is not in the demo bundle.`, 404);
  },

  async fieldLightcurve(fieldId: string) {
    const bundle = await loadBundle();
    return wait(fieldFor(bundle, fieldId).field_lightcurve);
  },

  async spectrum(fieldId: string) {
    const bundle = await loadBundle();
    return wait(fieldFor(bundle, fieldId).spectrum);
  },

  async overlays(fieldId: string, kind: 'known' | 'hypothesis') {
    const bundle = await loadBundle();
    return wait({ data: fieldFor(bundle, fieldId).overlays[kind], meta: {} });
  },

  async experiments(fieldId: string) {
    const bundle = await loadBundle();
    return wait({ data: fieldFor(bundle, fieldId).experiments, meta: {} });
  },

  async experiment(experimentId: string) {
    const bundle = await loadBundle();
    for (const entry of Object.values(bundle.fields)) {
      const found = entry.experiments.experiments.find((item) => item.experiment_id === experimentId);
      if (found) return wait({ data: found, meta: {} });
    }
    throw new ApiError('ORB-API-002', `Experiment ${experimentId} is not in the demo bundle.`, 404);
  },

  async jobs(fieldId: string) {
    const bundle = await loadBundle();
    return wait({ data: fieldFor(bundle, fieldId).jobs, meta: {} });
  },

  async job(jobId: string) {
    const bundle = await loadBundle();
    for (const entry of Object.values(bundle.fields)) {
      const found = entry.jobs.jobs.find((item) => item.job_id === jobId);
      if (found) return wait({ data: found, meta: {} });
    }
    throw new ApiError('ORB-API-002', `Job ${jobId} is not in the demo bundle.`, 404);
  },

  async submitJob(body: JobSubmit) {
    const bundle = await loadBundle();
    if (!body.field_id) throw new ApiError('ORB-API-001', 'A field is required.', 422);
    const entry = fieldFor(bundle, body.field_id);
    const existing = entry.jobs.jobs.find((job) => job.kind === body.kind);
    if (existing) return wait({ data: existing, meta: { replayed: true } });
    const now = new Date().toISOString();
    const fallback: Job = {
      job_id: `j_mock_${body.kind}`,
      kind: body.kind,
      field_id: body.field_id,
      status: 'completed' as JobStatus,
      progress: { done: 1, total: 1, stage: 'done' },
      result: {},
      error_code: null,
      created_at: now,
      started_at: now,
      finished_at: now,
    };
    return wait({ data: fallback, meta: { mock: true } });
  },

  async cancelJob(jobId: string) {
    const job = await findJob(jobId);
    return wait({ data: { ...job, status: 'cancelled' as JobStatus }, meta: {} });
  },

  async estimate(body: JobSubmit) {
    const bundle = await loadBundle();
    const params = (body.params ?? {}) as Partial<MotionSearchParams>;
    const entry = body.field_id ? fieldFor(bundle, body.field_id) : null;
    const frames = entry?.frames.frames.length ?? 1;
    const density = params.grid_density ?? 'normal';
    const motion = density === 'coarse' ? 521 : density === 'fine' ? 2081 : 1041;
    const work = frames * motion * 59 * 59;
    return wait<{ data: Estimate; meta: Record<string, unknown> }>({
      data: {
        kind: body.kind,
        field_id: body.field_id,
        work,
        budget: 300_000_000,
        ok: work <= 300_000_000,
        frames,
        motion_vectors: motion,
      },
      meta: { mock: true },
    });
  },

  async chat(): Promise<never> {
    throw new ApiError('ORB-AS-001', 'The assistant is not configured.', 503);
  },

  frameImage(fieldId: string, frameRef: string) {
    return image(`${fieldId}/frame-${frameRef}.png`);
  },

  flagsImage(fieldId: string, frameRef: string) {
    return image(`${fieldId}/frame-${frameRef}.png`);
  },

  candidateStack(fieldId: string, candidateId: string) {
    return image(`${fieldId}/stack-${candidateId}.png`);
  },

  candidateCutout(fieldId: string, candidateId: string, frameRef: string) {
    return image(`${fieldId}/cutout-${candidateId}-${frameRef}.png`);
  },
};
