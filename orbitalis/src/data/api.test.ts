import { describe, expect, it } from 'vitest';
import { api, ApiError } from './api';
import { explainCandidate } from './explain';

describe('mock api', () => {
  it('returns the field, stationary sources and candidates', async () => {
    const [field, stationary, candidates] = await Promise.all([api.field(), api.stationary(), api.candidates()]);
    expect(field.synthetic).toBe(true);
    expect(stationary).toHaveLength(500);
    expect(candidates).toHaveLength(31);
  });

  it('keeps the list light: no spectra in summaries', async () => {
    const [first] = await api.candidates();
    expect('spectrum' in first).toBe(false);
    expect('cutout' in first).toBe(false);
  });

  it('returns a full dossier for one candidate', async () => {
    const c = await api.candidate(42);
    expect(c.spectrum).toHaveLength(102);
    expect(c.offsetsArcsec).toHaveLength(3);
    expect(c.crossMatches.length).toBeGreaterThan(0);
  });

  it('rejects unknown candidates with a 404', async () => {
    await expect(api.candidate(99999)).rejects.toBeInstanceOf(ApiError);
    await expect(api.candidate(99999)).rejects.toMatchObject({ status: 404 });
    await expect(api.explanation(99999)).rejects.toMatchObject({ status: 404 });
  });

  it('writes explanations that only use numbers from the record', async () => {
    const c = await api.candidate(42);
    const e = await api.explanation(42);
    expect(e.text).toContain('3.7″');
    expect(e.text).toContain('bands 62 to 74');
    expect(e.text).not.toMatch(/planet|discover|confirmed/i);
    expect(e.caveat).toMatch(/cannot add measurements/);
    expect(explainCandidate(c, 6.2).generatedBy).toMatch(/template/);
  });

  it('explains known and variable candidates differently', async () => {
    const known = await api.explanation(231);
    expect(known.text).toMatch(/known solar-system object/);
    const variable = await api.explanation(9);
    expect(variable.text).toMatch(/variable source/);
  });
});
