import { describe, expect, it } from 'vitest';
import { parseCoordinates } from './parseCoords';

describe('parseCoordinates', () => {
  it('reads decimal degrees separated by a space', () => {
    expect(parseCoordinates('156.09 -41.64')).toEqual({ ra: 156.09, dec: -41.64 });
  });

  it('reads decimal degrees separated by a comma and plus sign', () => {
    expect(parseCoordinates('163.017, +57.469')).toEqual({ ra: 163.017, dec: 57.469 });
  });

  it('reads sexagesimal hours and degrees', () => {
    const parsed = parseCoordinates('10h52m04s +57d28m11s');
    expect(parsed).not.toBeNull();
    expect(parsed!.ra).toBeCloseTo(163.0167, 3);
    expect(parsed!.dec).toBeCloseTo(57.4697, 3);
  });

  it('rejects out-of-range and incomplete input', () => {
    expect(parseCoordinates('400 10')).toBeNull();
    expect(parseCoordinates('156.09')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('not coordinates')).toBeNull();
  });
});
