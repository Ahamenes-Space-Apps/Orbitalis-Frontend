import type { CandidateDetail, CandidateSummary, Epoch, EpochId, FieldInfo } from '@/data/types';
import type { SkyPos } from './coords';
import { padId } from './coords';

export const EPOCH_IDS: EpochId[] = [1, 2, 3, 4, 5, 6];
export const BASE_MJD = 61000;

const MJD_ORIGIN = Date.UTC(1858, 10, 17);

export function bandWavelength(band: number): number {
  return 0.75 + ((Math.max(1, Math.min(102, band)) - 1) / 101) * 4.25;
}

export function bandAtWavelength(um: number): number {
  return 1 + ((um - 0.75) / 4.25) * 101;
}

export function bandLabel(band: number): string {
  return `B${String(band).padStart(3, '0')}`;
}

export function formatDeltaMag(v: number, digits = 2): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `Δ${sign}${Math.abs(v).toFixed(digits)}m`;
}

export function fluxPctAt(epoch: number, totalPct: number, count: number, id: number): number {
  if (count <= 1) return totalPct;
  const p = Math.max(0, Math.min(1, (epoch - 1) / (count - 1)));
  const wobble = Math.sin(p * Math.PI * 1.5 + id * 0.37) * 0.08 * Math.abs(totalPct);
  return p === 0 ? 0 : p === 1 ? totalPct : totalPct * p + wobble;
}

export function deltaMagAt(epoch: number, candidate: Pick<CandidateSummary, 'fluxChangePct' | 'id' | 'positions'>): number {
  const pct = fluxPctAt(epoch, candidate.fluxChangePct, candidate.positions.length, candidate.id);
  return -2.5 * Math.log10(Math.max(0.05, 1 + pct / 100));
}

export function finalDeltaMag(candidate: Pick<CandidateSummary, 'fluxChangePct'>): number {
  return -2.5 * Math.log10(Math.max(0.05, 1 + candidate.fluxChangePct / 100));
}

export function epochPosition(positions: SkyPos[], epoch: number): SkyPos {
  return positions[Math.max(0, Math.min(positions.length - 1, epoch - 1))];
}

export function epochOffset(offsets: { dx: number; dy: number }[], epoch: number): { dx: number; dy: number } {
  return offsets[Math.max(0, Math.min(offsets.length - 1, epoch - 1))];
}

export function epochForField(field: FieldInfo | undefined, epoch: number): Epoch | undefined {
  return field?.epochs.find((e) => e.id === epoch) ?? field?.epochs[field.epochs.length - 1];
}

export function epochDays(field: FieldInfo | undefined, epoch: number): number {
  const epochs = field?.epochs;
  if (!epochs?.length) return 0;
  const direct = epochs.find((e) => e.id === epoch);
  if (direct) return direct.daysSinceFirst;
  const last = epochs[epochs.length - 1];
  const step = epochs.length > 1 ? epochs[1].daysSinceFirst - epochs[0].daysSinceFirst : 182;
  return last.daysSinceFirst + (epoch - last.id) * step;
}

export function epochMjd(field: FieldInfo | undefined, epoch: number): number {
  return BASE_MJD + epochDays(field, epoch);
}

export function mjdToDate(mjd: number): Date {
  return new Date(MJD_ORIGIN + mjd * 86400000);
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMjd(mjd: number): string {
  return mjd.toFixed(1);
}

export function candidateTitle(c: Pick<CandidateSummary, 'cls' | 'truth' | 'knownMatch'>): string {
  if (c.truth === 'planted-high-interest') return 'High-interest transient';
  if (c.knownMatch) return 'Known solar-system object';
  return c.cls === 'moving' ? 'Moving source' : 'Variable source';
}

export function candidateDesignation(id: number): string {
  return `ORB-${padId(id)}`;
}

export function candidateCategory(c: Pick<CandidateSummary, 'cls' | 'truth' | 'knownMatch'>): string {
  if (c.knownMatch) return 'Known';
  if (c.truth === 'planted-high-interest') return 'High interest';
  return c.cls === 'moving' ? 'Moving' : 'Variable';
}

/** Linear interpolation between the available epochs, so the 6-epoch UI never invents endpoints. */
export function resampleOffsets(
  offsets: { dx: number; dy: number }[],
  count = 6,
): { dx: number; dy: number }[] {
  if (offsets.length === 0) return Array.from({ length: count }, () => ({ dx: 0, dy: 0 }));
  if (offsets.length === count) return offsets;
  const out: { dx: number; dy: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * (offsets.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(offsets.length - 1, lo + 1);
    const f = t - lo;
    out.push({
      dx: offsets[lo].dx * (1 - f) + offsets[hi].dx * f,
      dy: offsets[lo].dy * (1 - f) + offsets[hi].dy * f,
    });
  }
  return out;
}

export interface SpectrumPoint {
  band: number;
  wavelength: number;
  flux: number;
  baseline: number;
  delta: number;
}

const MJY_SCALE = 2.4;

export function spectrumPoints(candidate: CandidateDetail, epoch: number): SpectrumPoint[] {
  const pct = fluxPctAt(epoch, candidate.fluxChangePct, candidate.positions.length, candidate.id);
  const factor = 1 + pct / 100;
  return candidate.spectrum.map((v, i) => {
    const baseline = v * MJY_SCALE;
    const feature = 1 + Math.sin((i + 1) * 0.31 + candidate.id) * 0.004 * (epoch - 1);
    const flux = baseline * factor * feature * (0.72 + candidate.medianSpectrum[i]);
    const base = baseline * (0.72 + candidate.medianSpectrum[i]);
    return {
      band: i + 1,
      wavelength: bandWavelength(i + 1),
      flux,
      baseline: base,
      delta: flux - base,
    };
  });
}

export const SPECTRAL_DIAGNOSTICS = [
  { label: 'Silicate', um: 1.0 },
  { label: 'H₂O', um: 1.9 },
  { label: 'Hydrated', um: 2.7 },
  { label: 'H₂O Ice', um: 3.0 },
  { label: 'Organics', um: 3.4 },
  { label: 'CO₂', um: 4.26 },
] as const;

export const LVF_BANDS = [
  { band: 1, range: '0.75–1.07', r: 41, note: 'Near-IR continuum' },
  { band: 2, range: '1.07–1.50', r: 46, note: 'Silicate shoulder' },
  { band: 3, range: '1.50–2.11', r: 51, note: 'H₂O / hydrated' },
  { band: 4, range: '2.11–2.97', r: 56, note: 'Ice absorption' },
  { band: 5, range: '2.97–3.82', r: 61, note: 'Organics' },
  { band: 6, range: '3.82–5.00', r: 65, note: 'CO₂ / thermal' },
] as const;
