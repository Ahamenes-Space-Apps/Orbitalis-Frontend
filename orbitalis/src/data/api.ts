import { explainCandidate } from './explain';
import { getSyntheticField } from './synthetic';
import type { CandidateDetail, CandidateSummary, Explanation, FieldInfo, StationarySource } from './types';

/**
 * API client.
 *
 * - VITE_API_URL unset: serves the built-in synthetic field (mock mode, no backend needed).
 * - VITE_API_URL=/api (or a full URL): calls the real backend. See README for the endpoint contract.
 */

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
export const usingMockApi = BASE === '';

const MOCK_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 150;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function http<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

function later<T>(value: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(value());
      } catch (e) {
        reject(e);
      }
    }, MOCK_LATENCY_MS);
  });
}

function toSummary(c: CandidateDetail): CandidateSummary {
  const { spectrum: _s, medianSpectrum: _m, offsetsArcsec: _o, cutout: _c, crossMatches: _x, ...summary } = c;
  void [_s, _m, _o, _c, _x];
  return summary;
}

export const api = {
  field: (): Promise<FieldInfo> => (BASE ? http('/field') : later(() => getSyntheticField().field)),

  stationary: (): Promise<StationarySource[]> =>
    BASE ? http('/sources?class=stationary') : later(() => getSyntheticField().stationary),

  candidates: (): Promise<CandidateSummary[]> =>
    BASE ? http('/candidates') : later(() => getSyntheticField().candidates.map(toSummary)),

  candidate: (id: number): Promise<CandidateDetail> =>
    BASE
      ? http(`/candidates/${id}`)
      : later(() => {
          const found = getSyntheticField().candidates.find((c) => c.id === id);
          if (!found) throw new ApiError(404, `Candidate ${id} not found`);
          return found;
        }),

  explanation: (id: number): Promise<Explanation> =>
    BASE
      ? http(`/candidates/${id}/explanation`)
      : later(() => {
          const synth = getSyntheticField();
          const found = synth.candidates.find((c) => c.id === id);
          if (!found) throw new ApiError(404, `Candidate ${id} not found`);
          return explainCandidate(found, synth.field.pixelScaleArcsec);
        }),
};
