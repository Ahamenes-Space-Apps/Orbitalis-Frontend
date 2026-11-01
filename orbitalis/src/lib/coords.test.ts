import { describe, expect, it } from 'vitest';
import { formatDec, formatRa, offsetToSky, separationArcsec, skyToOffset, toGalactic, wrapRa } from './coords';

describe('coordinates', () => {
  it('converts the Galactic Center to l≈0, b≈0', () => {
    const { l, b } = toGalactic({ ra: 266.405, dec: -28.936 });
    const lWrapped = l > 180 ? l - 360 : l;
    expect(Math.abs(lWrapped)).toBeLessThan(0.1);
    expect(Math.abs(b)).toBeLessThan(0.1);
  });

  it('puts the North Galactic Pole at b≈90', () => {
    const { b } = toGalactic({ ra: 192.85948, dec: 27.12825 });
    expect(b).toBeCloseTo(90, 1);
  });

  it('round-trips an arcsecond offset', () => {
    const center = { ra: 163.0175, dec: 57.4697 };
    const p = offsetToSky(center, 12.5, -7.25);
    const o = skyToOffset(center, p);
    expect(o.dx).toBeCloseTo(12.5, 6);
    expect(o.dy).toBeCloseTo(-7.25, 6);
    expect(separationArcsec(center, p)).toBeCloseTo(Math.hypot(12.5, 7.25), 6);
  });

  it('wraps right ascension across 0h', () => {
    expect(wrapRa(-10)).toBe(350);
    expect(wrapRa(370)).toBe(10);
    const center = { ra: 359.9999, dec: 10 };
    const p = offsetToSky(center, 30, 0);
    expect(p.ra).toBeLessThan(1);
    expect(skyToOffset(center, p).dx).toBeCloseTo(30, 4);
  });

  it('works near the pole without producing NaN', () => {
    const o = skyToOffset({ ra: 10, dec: 89.99 }, { ra: 10.5, dec: 89.99 });
    expect(Number.isFinite(o.dx)).toBe(true);
  });

  it('formats RA and Dec', () => {
    expect(formatRa(163.0175)).toBe('10h 52m 04.2s');
    expect(formatDec(57.4697)).toBe('+57° 28′ 11″');
    expect(formatDec(-0.5)).toBe('−00° 30′ 00″');
  });

  it('does not print 60 seconds', () => {
    expect(formatRa(359.99999999)).toBe('00h 00m 00.0s');
  });
});
