import { describe, expect, it } from 'vitest';
import { inWavelengthRange, normalizeWavelengthRange, wavelengthKey } from './wavelength';

describe('wavelength ranges', () => {
  it('matches coverage bins at the same 0.01 µm rounding', () => {
    expect(wavelengthKey(0.754)).toBe(0.75);
    expect(inWavelengthRange(0.754, [0.75, 1.1])).toBe(true);
    expect(inWavelengthRange(1.11, [0.75, 1.1])).toBe(false);
  });

  it('accepts reversed endpoints and treats null as unfiltered', () => {
    expect(inWavelengthRange(1, [1.6, 0.75])).toBe(true);
    expect(inWavelengthRange(9, null)).toBe(true);
    expect(normalizeWavelengthRange([1.6, 0.75])).toEqual([0.75, 1.6]);
  });

  it('rejects non-finite ranges', () => {
    expect(normalizeWavelengthRange([Number.NaN, 1])).toBeNull();
    expect(normalizeWavelengthRange(null)).toBeNull();
  });
});
