/**
 * Inclusive wavelength selections over stored frame wavelengths.
 *
 * Coverage bins group frames by wavelength rounded to 0.01 µm, so membership
 * uses the same rounding. Otherwise a frame at 0.754 µm could count as inside
 * a 0.75–1.10 µm selection in the chart but not in the filtered scrubber.
 */

export type WavelengthRange = [number, number];

export function wavelengthKey(um: number): number {
  return Math.round(um * 100) / 100;
}

export function inWavelengthRange(
  value: number,
  range: WavelengthRange | null | undefined,
): boolean {
  if (!range) return true;
  const low = wavelengthKey(Math.min(range[0], range[1]));
  const high = wavelengthKey(Math.max(range[0], range[1]));
  const key = wavelengthKey(value);
  return key >= low && key <= high;
}

export function normalizeWavelengthRange(
  range: WavelengthRange | null | undefined,
): WavelengthRange | null {
  if (!range) return null;
  const low = wavelengthKey(Math.min(range[0], range[1]));
  const high = wavelengthKey(Math.max(range[0], range[1]));
  if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) return null;
  return [low, high];
}
