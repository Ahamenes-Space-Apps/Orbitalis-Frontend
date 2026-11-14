/**
 * Shared formatters. The UX design fixes these formats (§9.2), so every
 * screen imports them instead of formatting numbers inline.
 */

import { formatDec, formatGalactic, formatRa } from './coords';

export { formatDec, formatGalactic, formatRa };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatId(ordinal: number | null | undefined): string {
  if (ordinal === null || ordinal === undefined || !Number.isFinite(ordinal)) return '#—';
  return `#${String(ordinal).padStart(3, '0')}`;
}

/** 1.70 µm */
export function formatWavelength(um: number | null | undefined): string {
  if (um === null || um === undefined || !Number.isFinite(um)) return '—';
  return `${um.toFixed(2)} µm`;
}

/** 12.4″/day */
export function formatRate(arcsecPerDay: number | null | undefined): string {
  if (arcsecPerDay === null || arcsecPerDay === undefined || !Number.isFinite(arcsecPerDay)) {
    return '—';
  }
  return `${arcsecPerDay.toFixed(1)}″/day`;
}

/** 83° (east of north) */
export function formatPositionAngle(angleDeg: number | null | undefined): string {
  if (angleDeg === null || angleDeg === undefined || !Number.isFinite(angleDeg)) return '—';
  const normalised = ((angleDeg % 360) + 360) % 360;
  return `${normalised.toFixed(0)}° (east of north)`;
}

/** 0.05° below a degree, arcmin below that. */
export function formatFieldSize(radiusDeg: number): string {
  if (!Number.isFinite(radiusDeg)) return '—';
  if (radiusDeg >= 0.1) return `${(radiusDeg * 2).toFixed(2)}° across`;
  return `${(radiusDeg * 60).toFixed(1)}′ across`;
}

export function formatArcsec(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}″`;
}

export function formatSnr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(1);
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** Very small surface-brightness values, e.g. `1.5e-8 MJy`. */
export function formatFluxMjy(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return '0 MJy';
  return `${value.toExponential(1)} MJy`;
}

export function formatMjd(mjd: number): string {
  return `MJD ${mjd.toFixed(4)}`;
}

/** ISO date from an MJD. */
export function formatMjdDate(mjd: number): string {
  if (!Number.isFinite(mjd)) return '—';
  const ms = (mjd - 40587) * 86_400_000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

/** "14 Jun 2025" */
export function formatMjdDay(mjd: number): string {
  if (!Number.isFinite(mjd)) return '—';
  const ms = (mjd - 40587) * 86_400_000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "14 Jun to 28 Oct" */
export function formatDateRange(mjdA: number, mjdB: number): string {
  const a = new Date((mjdA - 40587) * 86_400_000);
  const b = new Date((mjdB - 40587) * 86_400_000);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—';
  const left = `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`;
  const right = `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  return `${left} to ${right}`;
}

export function formatRelease(release: string | null | undefined): string {
  return release ? release.toUpperCase() : '—';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-GB');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
