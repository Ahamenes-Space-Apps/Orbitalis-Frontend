import type { KnownMatch, ScoreComponents } from '@/data/types';

export interface Weights {
  M: number;
  B: number;
  S: number;
  T: number;
}

/** S = wM·M + wB·B + wS·S + wT·T, weights normalised to sum to 1. */
export const DEFAULT_WEIGHTS: Weights = { M: 0.4, B: 0.05, S: 0.3, T: 0.25 };

/** Candidates that match a catalogued object are kept in the list but ranked lower. */
export const KNOWN_OBJECT_FACTOR = 0.7;

export const COMPONENT_META: { key: keyof ScoreComponents; short: string; name: string; color: string }[] = [
  { key: 'M', short: 'M', name: 'Motion significance', color: '#F2B544' },
  { key: 'B', short: 'B', name: 'Brightness variation', color: '#8FA0C8' },
  { key: 'S', short: 'S', name: 'Spectral anomaly', color: '#A596FF' },
  { key: 'T', short: 'T', name: 'Temporal consistency', color: '#4FD1B5' },
];

export function normalizeWeights(w: Weights): Weights {
  const sum = w.M + w.B + w.S + w.T;
  if (!(sum > 0)) return { ...DEFAULT_WEIGHTS };
  return { M: w.M / sum, B: w.B / sum, S: w.S / sum, T: w.T / sum };
}

export interface Scorable {
  components: ScoreComponents;
  knownMatch: KnownMatch | null;
}

export function scoreOf(c: Scorable, weights: Weights): number {
  const w = normalizeWeights(weights);
  const raw = w.M * c.components.M + w.B * c.components.B + w.S * c.components.S + w.T * c.components.T;
  const clamped = Math.max(0, Math.min(1, raw));
  return c.knownMatch ? clamped * KNOWN_OBJECT_FACTOR : clamped;
}

export interface Contribution {
  key: keyof ScoreComponents;
  name: string;
  color: string;
  value: number;
  weight: number;
  contribution: number;
}

export function contributions(components: ScoreComponents, weights: Weights): Contribution[] {
  const w = normalizeWeights(weights);
  return COMPONENT_META.map((m) => ({
    key: m.key,
    name: m.name,
    color: m.color,
    value: components[m.key],
    weight: w[m.key],
    contribution: components[m.key] * w[m.key],
  }));
}

export type Ranked<T> = T & { score: number; rank: number };

export function rankCandidates<T extends Scorable & { id: number }>(items: T[], weights: Weights): Ranked<T>[] {
  return items
    .map((it) => ({ ...it, score: scoreOf(it, weights) }))
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .map((it, i) => ({ ...it, rank: i + 1 }));
}
