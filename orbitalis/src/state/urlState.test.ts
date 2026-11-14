import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYERS, readUrlValues } from './urlState';

describe('readUrlValues', () => {
  it('applies documented defaults', () => {
    const values = readUrlValues(new URLSearchParams());
    expect(values.ra).toBeNull();
    expect(values.r).toBe(0.1);
    expect(values.view).toBe('simple');
    expect(values.sys).toBe('eq');
    expect(values.exag).toBe(25);
    expect(values.layers).toEqual(DEFAULT_LAYERS);
  });

  it('parses the full URL state', () => {
    const values = readUrlValues(
      new URLSearchParams(
        'ra=156.09&dec=-41.64&r=0.05&rel=qr2&f=f_1&t=frame.1&sel=c_1&view=aladin&sys=gal&exag=8&layers=moving,known',
      ),
    );
    expect(values).toMatchObject({
      ra: 156.09,
      dec: -41.64,
      r: 0.05,
      rel: 'qr2',
      f: 'f_1',
      t: 'frame.1',
      sel: 'c_1',
      view: 'aladin',
      sys: 'gal',
      exag: 8,
      layers: ['moving', 'known'],
    });
  });

  it('clamps exaggeration and drops unknown layers', () => {
    const values = readUrlValues(new URLSearchParams('exag=999&layers=moving,nope'));
    expect(values.exag).toBe(100);
    expect(values.layers).toEqual(['moving']);
  });

  it('distinguishes an explicitly empty layer list from no parameter', () => {
    expect(readUrlValues(new URLSearchParams('layers=')).layers).toEqual([]);
    expect(readUrlValues(new URLSearchParams()).layers).toEqual(DEFAULT_LAYERS);
  });
});
