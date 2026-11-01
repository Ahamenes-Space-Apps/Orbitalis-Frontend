import { describe, expect, it } from 'vitest';
import { contributions, DEFAULT_WEIGHTS, KNOWN_OBJECT_FACTOR, normalizeWeights, rankCandidates, scoreOf } from './scoring';

const comp = { M: 0.95, B: 0.2, S: 0.97, T: 0.96 };

describe('scoring', () => {
  it('default weights sum to 1', () => {
    const w = DEFAULT_WEIGHTS;
    expect(w.M + w.B + w.S + w.T).toBeCloseTo(1, 10);
  });

  it('computes S as the weighted sum', () => {
    expect(scoreOf({ components: comp, knownMatch: null }, DEFAULT_WEIGHTS)).toBeCloseTo(0.921, 3);
  });

  it('normalises weights, and falls back to defaults when all are zero', () => {
    expect(normalizeWeights({ M: 2, B: 0, S: 2, T: 0 })).toEqual({ M: 0.5, B: 0, S: 0.5, T: 0 });
    expect(normalizeWeights({ M: 0, B: 0, S: 0, T: 0 })).toEqual(DEFAULT_WEIGHTS);
  });

  it('is unchanged by scaling every weight', () => {
    const a = scoreOf({ components: comp, knownMatch: null }, { M: 4, B: 1, S: 3, T: 2 });
    const b = scoreOf({ components: comp, knownMatch: null }, { M: 40, B: 10, S: 30, T: 20 });
    expect(a).toBeCloseTo(b, 10);
  });

  it('lowers the score of a known object', () => {
    const known = { catalog: 'x', object: 'y', separationArcsec: 1 };
    const plain = scoreOf({ components: comp, knownMatch: null }, DEFAULT_WEIGHTS);
    const withMatch = scoreOf({ components: comp, knownMatch: known }, DEFAULT_WEIGHTS);
    expect(withMatch).toBeCloseTo(plain * KNOWN_OBJECT_FACTOR, 10);
  });

  it('contributions add up to the unpenalised score', () => {
    const total = contributions(comp, DEFAULT_WEIGHTS).reduce((s, c) => s + c.contribution, 0);
    expect(total).toBeCloseTo(scoreOf({ components: comp, knownMatch: null }, DEFAULT_WEIGHTS), 10);
  });

  it('ranks by score, breaking ties by id, and re-ranks when weights change', () => {
    const a = { id: 1, components: { M: 1, B: 0, S: 0, T: 0 }, knownMatch: null };
    const b = { id: 2, components: { M: 0, B: 0, S: 1, T: 0 }, knownMatch: null };
    expect(rankCandidates([a, b], { M: 1, B: 0, S: 0, T: 0 }).map((r) => r.id)).toEqual([1, 2]);
    expect(rankCandidates([a, b], { M: 0, B: 0, S: 1, T: 0 }).map((r) => r.id)).toEqual([2, 1]);
    expect(rankCandidates([a, b], { M: 1, B: 0, S: 1, T: 0 }).map((r) => r.id)).toEqual([1, 2]);
    expect(rankCandidates([a, b], DEFAULT_WEIGHTS).map((r) => r.rank)).toEqual([1, 2]);
  });
});
