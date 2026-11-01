import { describe, expect, it } from 'vitest';
import { generateSyntheticField, PLANTED_ID } from './synthetic';
import { DEFAULT_WEIGHTS, rankCandidates } from '@/lib/scoring';
import { BAND_COUNT } from './types';
import { skyToOffset } from '@/lib/coords';

const synth = generateSyntheticField();

describe('synthetic field', () => {
  it('matches the brief: 500 stationary, 20 variable, 10 moving, 1 planted', () => {
    expect(synth.stationary).toHaveLength(500);
    const byTruth = (t: string) => synth.candidates.filter((c) => c.truth === t).length;
    expect(byTruth('planted-variable')).toBe(20);
    expect(byTruth('planted-moving')).toBe(10);
    expect(byTruth('planted-high-interest')).toBe(1);
    expect(synth.candidates).toHaveLength(31);
    expect(synth.field.counts).toEqual({ stationary: 500, variable: 20, moving: 10, highInterest: 1 });
  });

  it('is deterministic', () => {
    const again = generateSyntheticField();
    expect(again.candidates.map((c) => c.positions[0])).toEqual(synth.candidates.map((c) => c.positions[0]));
    expect(again.stationary[0]).toEqual(synth.stationary[0]);
  });

  it('has unique candidate ids', () => {
    expect(new Set(synth.candidates.map((c) => c.id)).size).toBe(31);
  });

  it('plants #042 with a 3.7″ shift over three epochs and a flagged band range 62 to 74', () => {
    const p = synth.candidates.find((c) => c.id === PLANTED_ID)!;
    expect(p.cls).toBe('moving');
    expect(p.displacementArcsec).toBeCloseTo(3.7, 1);
    expect(p.positions).toHaveLength(3);
    expect(p.flaggedBands).toEqual([62, 74]);
    expect(p.knownMatch).toBeNull();
    expect(p.fluxChangePct).toBeCloseTo(0.8, 5);
    const o = skyToOffset(p.positions[0], p.positions[2]);
    expect(Math.hypot(o.dx, o.dy)).toBeCloseTo(p.displacementArcsec, 1);
  });

  it('gives every candidate 102-band spectra and finite values', () => {
    for (const c of synth.candidates) {
      expect(c.spectrum).toHaveLength(BAND_COUNT);
      expect(c.medianSpectrum).toHaveLength(BAND_COUNT);
      expect(c.spectrum.every(Number.isFinite)).toBe(true);
      expect(Object.values(c.components).every((v) => v >= 0 && v <= 1)).toBe(true);
    }
  });

  it('the flagged bands of the planted object really stand out from the median', () => {
    const p = synth.candidates.find((c) => c.id === PLANTED_ID)!;
    const peak = Math.max(...p.spectrum.slice(61, 74).map((v, i) => v - p.medianSpectrum[61 + i]));
    expect(peak).toBeGreaterThan(0.15);
    const outside = Math.max(...p.spectrum.slice(0, 55).map((v, i) => Math.abs(v - p.medianSpectrum[i])));
    expect(outside).toBeLessThan(0.1);
  });

  it('keeps every source inside the field', () => {
    const half = (synth.field.fovArcmin * 60) / 2 + 5;
    for (const c of synth.candidates) {
      for (const pos of c.positions) {
        const o = skyToOffset(synth.field.center, pos);
        expect(Math.abs(o.dx)).toBeLessThan(half);
        expect(Math.abs(o.dy)).toBeLessThan(half);
      }
    }
  });

  it('ranks the planted object first with the default weights', () => {
    const ranked = rankCandidates(synth.candidates, DEFAULT_WEIGHTS);
    expect(ranked[0].id).toBe(PLANTED_ID);
    expect(ranked[0].score).toBeCloseTo(0.92, 2);
  });

  it('marks two moving candidates as known objects', () => {
    const known = synth.candidates.filter((c) => c.knownMatch);
    expect(known.map((c) => c.id).sort((a, b) => a - b)).toEqual([76, 231]);
    expect(known.every((c) => c.cls === 'moving')).toBe(true);
  });
});
