import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { rankCandidates, type Ranked } from '@/lib/scoring';
import { useUi } from '@/store/useUi';
import type { CandidateSummary } from './types';

export const keys = {
  field: ['field'] as const,
  stationary: ['stationary'] as const,
  candidates: ['candidates'] as const,
  candidate: (id: number) => ['candidate', id] as const,
  explanation: (id: number) => ['explanation', id] as const,
};

export const useField = () => useQuery({ queryKey: keys.field, queryFn: api.field, staleTime: Infinity });

export const useStationary = () =>
  useQuery({ queryKey: keys.stationary, queryFn: api.stationary, staleTime: Infinity });

export const useCandidates = () =>
  useQuery({ queryKey: keys.candidates, queryFn: api.candidates, staleTime: 5 * 60_000 });

export const useCandidate = (id: number | null) =>
  useQuery({
    queryKey: keys.candidate(id ?? -1),
    queryFn: () => api.candidate(id as number),
    enabled: id !== null && Number.isFinite(id),
    retry: false,
    staleTime: 5 * 60_000,
  });

export const useExplanation = (id: number | null) =>
  useQuery({
    queryKey: keys.explanation(id ?? -1),
    queryFn: () => api.explanation(id as number),
    enabled: id !== null && Number.isFinite(id),
    retry: false,
    staleTime: 5 * 60_000,
  });

/** All candidates, scored with the current weights, filtered by the current UI filters, best first. */
export function useRankedCandidates(opts: { applyFilters?: boolean } = {}) {
  const { applyFilters = true } = opts;
  const query = useCandidates();
  const weights = useUi((s) => s.weights);
  const classFilter = useUi((s) => s.classFilter);
  const hideKnown = useUi((s) => s.hideKnown);

  const ranked = useMemo<Ranked<CandidateSummary>[]>(
    () => (query.data ? rankCandidates(query.data, weights) : []),
    [query.data, weights],
  );

  const visible = useMemo(() => {
    if (!applyFilters) return ranked;
    return ranked.filter((c) => (classFilter === 'all' || c.cls === classFilter) && !(hideKnown && c.knownMatch));
  }, [ranked, applyFilters, classFilter, hideKnown]);

  return { ...query, ranked, visible };
}
