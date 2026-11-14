/**
 * Typed HTTP client for the ORBITALIS API.
 *
 * `VITE_API_URL` is the full API root, for example
 * `http://localhost:8080/api/v1`. When it is unset the client serves
 * `public/mock/bundle.json` instead and `usingMockApi` is true.
 */

import { ApiError } from './errors';
import { mockApi } from './mock';
import type {
  ApiErrorEnvelope,
  CandidateDetail,
  CandidateFrameList,
  CandidateSummary,
  Capabilities,
  ChatContext,
  ChatMessage,
  Envelope,
  Estimate,
  Experiment,
  Field,
  Frame,
  Health,
  Job,
  JobSubmit,
  Lightcurve,
  Methods,
  MotionSearchParams,
  Overlay,
  Preset,
  Release,
  Spectrum,
} from './types';

const RAW_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
export const usingMockApi = RAW_BASE === '';
export const API_BASE = RAW_BASE;

function endpoint(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('ORB-GW-001', 'The API did not respond.', 0);
  }

  if (!response.ok) {
    let envelope: ApiErrorEnvelope | null = null;
    try {
      envelope = (await response.json()) as ApiErrorEnvelope;
    } catch {
      /* Non-JSON error body. */
    }
    if (envelope?.error) {
      throw new ApiError(
        envelope.error.code,
        envelope.error.message,
        response.status,
        envelope.error.detail,
      );
    }
    throw new ApiError('ORB-SYS-001', `Request failed (${response.status}).`, response.status);
  }

  return (await response.json()) as Envelope<T>;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
});

function searchParams(values: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export interface StreamEvent {
  event: string;
  data: unknown;
  id?: string;
}

/** Parse a `text/event-stream` body into events. Used for the POST chat stream. */
export async function* parseSse(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new ApiError('ORB-GW-001', 'The stream had no body.', 0);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseEventBlock(raw);
        if (event) yield event;
        boundary = buffer.indexOf('\n\n');
      }
    }
    const tail = parseEventBlock(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseEventBlock(raw: string): StreamEvent | null {
  let event = 'message';
  let id: string | undefined;
  const data: string[] = [];
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    else if (field === 'id') id = value;
  }
  if (data.length === 0 && event === 'message') return null;
  const text = data.join('\n');
  if (!text) return { event, data: null, id };
  try {
    return { event, data: JSON.parse(text), id };
  } catch {
    return { event, data: text, id };
  }
}

export const api = {
  // ---- Static / capability endpoints -------------------------------------
  health: () => (usingMockApi ? mockApi.health() : request<Health>('/health')),

  capabilities: () =>
    usingMockApi ? mockApi.capabilities() : request<Capabilities>('/capabilities'),

  presets: () =>
    usingMockApi ? mockApi.presets() : request<{ presets: Preset[] }>('/presets'),

  releases: () =>
    usingMockApi ? mockApi.releases() : request<{ releases: Release[] }>('/releases'),

  methods: () => (usingMockApi ? mockApi.methods() : request<Methods>('/methods')),

  // ---- Fields -------------------------------------------------------------
  createField: (body: {
    preset?: string | null;
    ra?: number | null;
    dec?: number | null;
    radius_deg?: number;
    release?: string | null;
    time_range?: [string, string] | null;
  }) => (usingMockApi ? mockApi.createField(body) : request<Field>('/fields', json(body))),

  field: (fieldId: string) =>
    usingMockApi ? mockApi.field(fieldId) : request<Field>(`/fields/${encodeURIComponent(fieldId)}`),

  frames: (fieldId: string) =>
    usingMockApi
      ? mockApi.frames(fieldId)
      : request<{ frames: Frame[] }>(`/fields/${encodeURIComponent(fieldId)}/frames`),

  candidates: (fieldId: string, sort?: 'model_score' | 'stack_snr') =>
    usingMockApi
      ? mockApi.candidates(fieldId, sort)
      : request<{ candidates: CandidateSummary[] }>(
          `/fields/${encodeURIComponent(fieldId)}/candidates${searchParams({ sort })}`,
        ),

  overlays: (fieldId: string, kind: 'known' | 'hypothesis') =>
    usingMockApi
      ? mockApi.overlays(fieldId, kind)
      : request<Overlay>(`/fields/${encodeURIComponent(fieldId)}/overlays/${kind}`),

  fieldLightcurve: (fieldId: string, ra: number, dec: number) =>
    usingMockApi
      ? mockApi.fieldLightcurve(fieldId)
      : request<Lightcurve>(`/fields/${encodeURIComponent(fieldId)}/lightcurve${searchParams({ ra, dec })}`),

  spectrum: (fieldId: string, ra: number, dec: number) =>
    usingMockApi
      ? mockApi.spectrum(fieldId)
      : request<Spectrum>(`/fields/${encodeURIComponent(fieldId)}/spectrum${searchParams({ ra, dec })}`),

  candidateSpectrum: (candidateId: string) =>
    usingMockApi
      ? mockApi.candidateSpectrum(candidateId)
      : request<Spectrum>(`/candidates/${encodeURIComponent(candidateId)}/spectrum`),

  experiments: (fieldId: string) =>
    usingMockApi
      ? mockApi.experiments(fieldId)
      : request<{ experiments: Experiment[] }>(`/fields/${encodeURIComponent(fieldId)}/experiments`),

  experiment: (experimentId: string) =>
    usingMockApi
      ? mockApi.experiment(experimentId)
      : request<Experiment>(`/experiments/${encodeURIComponent(experimentId)}`),

  // ---- Candidates ---------------------------------------------------------
  candidate: (candidateId: string) =>
    usingMockApi
      ? mockApi.candidate(candidateId)
      : request<CandidateDetail>(`/candidates/${encodeURIComponent(candidateId)}`),

  candidateFrames: (candidateId: string) =>
    usingMockApi
      ? mockApi.candidateFrames(candidateId)
      : request<CandidateFrameList>(`/candidates/${encodeURIComponent(candidateId)}/frames`),

  candidateLightcurve: (candidateId: string) =>
    usingMockApi
      ? mockApi.candidateLightcurve(candidateId)
      : request<Lightcurve>(`/candidates/${encodeURIComponent(candidateId)}/lightcurve`),

  // ---- Jobs ---------------------------------------------------------------
  jobs: (fieldId: string) =>
    usingMockApi
      ? mockApi.jobs(fieldId)
      : request<{ jobs: Job[] }>(`/jobs${searchParams({ field_id: fieldId })}`),

  job: (jobId: string) =>
    usingMockApi ? mockApi.job(jobId) : request<Job>(`/jobs/${encodeURIComponent(jobId)}`),

  submitJob: (body: JobSubmit) =>
    usingMockApi ? mockApi.submitJob(body) : request<Job>('/jobs', json(body)),

  cancelJob: (jobId: string) =>
    usingMockApi
      ? mockApi.cancelJob(jobId)
      : request<Job>(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }),

  estimate: (body: JobSubmit) =>
    usingMockApi ? mockApi.estimate(body) : request<Estimate>('/jobs/estimate', json(body)),

  // ---- Images -------------------------------------------------------------
  frameImage: (fieldId: string, frameRef: string) =>
    usingMockApi
      ? mockApi.frameImage(fieldId, frameRef)
      : endpoint(`/fields/${encodeURIComponent(fieldId)}/frames/${encodeURIComponent(frameRef)}.png`),

  flagsImage: (fieldId: string, frameRef: string) =>
    usingMockApi
      ? mockApi.flagsImage(fieldId, frameRef)
      : endpoint(
          `/fields/${encodeURIComponent(fieldId)}/frames/${encodeURIComponent(frameRef)}/flags.png`,
        ),

  candidateStack: (fieldId: string, candidateId: string) =>
    usingMockApi
      ? mockApi.candidateStack(fieldId, candidateId)
      : endpoint(`/candidates/${encodeURIComponent(candidateId)}/stack.png`),

  candidateCutout: (fieldId: string, candidateId: string, frameRef: string) =>
    usingMockApi
      ? mockApi.candidateCutout(fieldId, candidateId, frameRef)
      : endpoint(
          `/candidates/${encodeURIComponent(candidateId)}/frames/${encodeURIComponent(frameRef)}.png`,
        ),

  // ---- Assistant ----------------------------------------------------------
  async chat(
    messages: ChatMessage[],
    context: ChatContext,
    signal?: AbortSignal,
  ): Promise<Response> {
    if (usingMockApi) {
      throw new ApiError('ORB-AS-001', 'The assistant is not configured in mock mode.', 503);
    }
    let response: Response;
    try {
      response = await fetch(endpoint('/assistant/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ messages, context }),
        signal,
      });
    } catch {
      throw new ApiError('ORB-AS-001', 'The assistant did not respond.', 0);
    }
    if (!response.ok) {
      let envelope: ApiErrorEnvelope | null = null;
      try {
        envelope = (await response.json()) as ApiErrorEnvelope;
      } catch {
        /* ignore */
      }
      throw new ApiError(
        envelope?.error.code ?? 'ORB-AS-001',
        envelope?.error.message ?? 'The assistant is unavailable right now.',
        response.status,
        envelope?.error.detail,
      );
    }
    return response;
  },
};

/** Build a job payload for the search form. */
export function searchJob(
  fieldId: string,
  params: MotionSearchParams,
): JobSubmit {
  return { kind: 'moving_object_search', field_id: fieldId, params: { ...params } };
}

/** Default search parameters. Units follow SDD §8.2b (arcsec/day, degrees). */
export const DEFAULT_SEARCH: MotionSearchParams = {
  frame_refs: null,
  rate_arcsec_per_day: [0, 60],
  position_angle_deg: [0, 360],
  grid_density: 'normal',
  rank: false,
};
