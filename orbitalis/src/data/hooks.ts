/**
 * React Query bindings. Server data is cached by endpoint + ids; nothing is
 * edited locally. Streams update the same cache the screens already read.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, usingMockApi, API_BASE } from './api';
import type { CandidateSummary, Field, Frame, Job, RankBasis } from './types';

export const keys = {
  health: ['health'] as const,
  capabilities: ['capabilities'] as const,
  presets: ['presets'] as const,
  releases: ['releases'] as const,
  methods: ['methods'] as const,
  field: (id: string) => ['field', id] as const,
  frames: (id: string) => ['frames', id] as const,
  candidates: (id: string, sort: RankBasis) => ['candidates', id, sort] as const,
  overlays: (id: string, kind: 'known' | 'hypothesis') => ['overlays', id, kind] as const,
  experiments: (id: string) => ['experiments', id] as const,
  experiment: (id: string) => ['experiment', id] as const,
  candidate: (id: string) => ['candidate', id] as const,
  candidateFrames: (id: string) => ['candidate-frames', id] as const,
  candidateLightcurve: (id: string) => ['candidate-lightcurve', id] as const,
  fieldLightcurve: (id: string, ra: number, dec: number) => ['field-lightcurve', id, ra, dec] as const,
  spectrum: (id: string, ra: number, dec: number) => ['spectrum', id, ra, dec] as const,
  candidateSpectrum: (id: string) => ['candidate-spectrum', id] as const,
  jobs: (id: string) => ['jobs', id] as const,
  job: (id: string) => ['job', id] as const,
};

export const useHealth = () =>
  useQuery({
    queryKey: keys.health,
    queryFn: api.health,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

export const useCapabilities = () =>
  useQuery({ queryKey: keys.capabilities, queryFn: api.capabilities, staleTime: Infinity });

export const usePresets = () =>
  useQuery({ queryKey: keys.presets, queryFn: api.presets, staleTime: Infinity });

export const useReleases = () =>
  useQuery({ queryKey: keys.releases, queryFn: api.releases, staleTime: Infinity });

export const useMethods = () =>
  useQuery({ queryKey: keys.methods, queryFn: api.methods, staleTime: Infinity });

export const useField = (fieldId: string | null) =>
  useQuery({
    queryKey: keys.field(fieldId ?? ''),
    queryFn: () => api.field(fieldId as string),
    enabled: Boolean(fieldId),
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === 'queued' || status === 'running' ? 1_500 : false;
    },
  });

export const useFrames = (fieldId: string | null) =>
  useQuery({
    queryKey: keys.frames(fieldId ?? ''),
    queryFn: () => api.frames(fieldId as string),
    enabled: Boolean(fieldId),
    staleTime: 5_000,
  });

export const useCandidates = (fieldId: string | null, sort: RankBasis = 'stack_snr') =>
  useQuery({
    queryKey: keys.candidates(fieldId ?? '', sort),
    queryFn: () => api.candidates(fieldId as string, sort),
    enabled: Boolean(fieldId),
    staleTime: 10_000,
  });

export const useOverlays = (
  fieldId: string | null,
  kind: 'known' | 'hypothesis',
  enabled: boolean,
) =>
  useQuery({
    queryKey: keys.overlays(fieldId ?? '', kind),
    queryFn: () => api.overlays(fieldId as string, kind),
    enabled: Boolean(fieldId) && enabled,
    staleTime: 60_000,
  });

export const useExperiments = (fieldId: string | null) =>
  useQuery({
    queryKey: keys.experiments(fieldId ?? ''),
    queryFn: () => api.experiments(fieldId as string),
    enabled: Boolean(fieldId),
    staleTime: 10_000,
  });

export const useExperiment = (experimentId: string | null) =>
  useQuery({
    queryKey: keys.experiment(experimentId ?? ''),
    queryFn: () => api.experiment(experimentId as string),
    enabled: Boolean(experimentId),
    staleTime: 60_000,
  });

export const useCandidate = (candidateId: string | null) =>
  useQuery({
    queryKey: keys.candidate(candidateId ?? ''),
    queryFn: () => api.candidate(candidateId as string),
    enabled: Boolean(candidateId),
    staleTime: 60_000,
  });

export const useCandidateFrames = (candidateId: string | null) =>
  useQuery({
    queryKey: keys.candidateFrames(candidateId ?? ''),
    queryFn: () => api.candidateFrames(candidateId as string),
    enabled: Boolean(candidateId),
    staleTime: 60_000,
  });

export const useCandidateLightcurve = (candidateId: string | null) =>
  useQuery({
    queryKey: keys.candidateLightcurve(candidateId ?? ''),
    queryFn: () => api.candidateLightcurve(candidateId as string),
    enabled: Boolean(candidateId),
    staleTime: 60_000,
  });

export const useFieldLightcurve = (fieldId: string | null, ra: number, dec: number) =>
  useQuery({
    queryKey: keys.fieldLightcurve(fieldId ?? '', ra, dec),
    queryFn: () => api.fieldLightcurve(fieldId as string, ra, dec),
    enabled: Boolean(fieldId) && Number.isFinite(ra) && Number.isFinite(dec),
    staleTime: 60_000,
  });

export const useSpectrum = (fieldId: string | null, ra: number, dec: number) =>
  useQuery({
    queryKey: keys.spectrum(fieldId ?? '', ra, dec),
    queryFn: () => api.spectrum(fieldId as string, ra, dec),
    enabled: Boolean(fieldId) && Number.isFinite(ra) && Number.isFinite(dec),
    staleTime: 60_000,
  });

export const useCandidateSpectrum = (candidateId: string | null) =>
  useQuery({
    queryKey: keys.candidateSpectrum(candidateId ?? ''),
    queryFn: () => api.candidateSpectrum(candidateId as string),
    enabled: Boolean(candidateId),
    staleTime: 60_000,
  });

export const useJobs = (fieldId: string | null) =>
  useQuery({
    queryKey: keys.jobs(fieldId ?? ''),
    queryFn: () => api.jobs(fieldId as string),
    enabled: Boolean(fieldId),
    staleTime: 2_000,
  });

export const useJob = (jobId: string | null) =>
  useQuery({
    queryKey: keys.job(jobId ?? ''),
    queryFn: () => api.job(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === 'queued' || status === 'running' ? 1_000 : false;
    },
  });

/** Sort candidates by the value the API says it sorted on (never mix bases). */
export function sortCandidates(
  candidates: CandidateSummary[],
  basis: RankBasis,
): CandidateSummary[] {
  return [...candidates].sort((a, b) => {
    const av = basis === 'model_score' ? (a.model_score?.value ?? -Infinity) : a.stack_snr;
    const bv = basis === 'model_score' ? (b.model_score?.value ?? -Infinity) : b.stack_snr;
    if (av !== bv) return bv - av;
    return (a.ordinal ?? 0) - (b.ordinal ?? 0);
  });
}

export function sortFrames(frames: Frame[], by: 'time' | 'wavelength'): Frame[] {
  return [...frames].sort((a, b) =>
    by === 'time' ? a.mjd - b.mjd : a.wavelength_um - b.wavelength_um,
  );
}

/** The job is in flight and worth watching. */
export function isActiveJob(job: Job | undefined): boolean {
  return job?.status === 'queued' || job?.status === 'running';
}

/**
 * Field SSE stream (GET, so EventSource handles Last-Event-ID replay).
 * Each event updates the query cache; the screen never waits for a refresh.
 */
export function useFieldStream(fieldId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!fieldId || !enabled || usingMockApi || typeof EventSource === 'undefined') return;
    const source = new EventSource(`${API_BASE}/fields/${encodeURIComponent(fieldId)}/events`);

    const updateFrame = (incoming: Frame & { png_url?: string; meta_url?: string }) => {
      queryClient.setQueryData<{ data: { frames: Frame[] }; meta: Record<string, unknown> }>(
        keys.frames(fieldId),
        (current) => {
          if (!current) return current;
          const frames = current.data.frames.some((f) => f.frame_ref === incoming.frame_ref)
            ? current.data.frames
            : [...current.data.frames, incoming];
          return { ...current, data: { frames } };
        },
      );
    };

    source.addEventListener('frame', (event) => {
      try {
        updateFrame(JSON.parse((event as MessageEvent).data) as Frame);
      } catch {
        /* ignore malformed event */
      }
      void queryClient.invalidateQueries({ queryKey: keys.field(fieldId) });
    });

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: keys.field(fieldId) });
      void queryClient.invalidateQueries({ queryKey: keys.frames(fieldId) });
    };

    source.addEventListener('snapshot', refresh);
    source.addEventListener('found', refresh);
    source.addEventListener('progress', refresh);
    source.addEventListener('done', () => {
      refresh();
      source.close();
    });
    source.addEventListener('error', () => {
      refresh();
      source.close();
    });

    return () => source.close();
  }, [fieldId, enabled, queryClient]);
}

/** Convenient field summary for the shell. */
export function fieldCaption(field: Field | undefined): string {
  if (!field) return '';
  const { ra, dec, radius_deg, release } = field.params;
  return `RA ${ra.toFixed(4)}° · Dec ${dec.toFixed(4)}° · r ${radius_deg}° · ${release.toUpperCase()}`;
}
