export interface SkyPos {
  /** Right ascension, ICRS degrees, 0 to 360. */
  ra: number;
  /** Declination, ICRS degrees, -90 to 90. */
  dec: number;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function wrapRa(ra: number): number {
  return ((ra % 360) + 360) % 360;
}

/** Move from `center` by (dx, dy) arcseconds on the tangent plane. dx is ΔRA·cos(dec), east positive. */
export function offsetToSky(center: SkyPos, dxArcsec: number, dyArcsec: number): SkyPos {
  const dec = center.dec + dyArcsec / 3600;
  const ra = center.ra + dxArcsec / 3600 / Math.cos(center.dec * D2R);
  return { ra: wrapRa(ra), dec };
}

/** Inverse of offsetToSky (small-angle approximation, fine for fields of a few arcminutes). */
export function skyToOffset(center: SkyPos, p: SkyPos): { dx: number; dy: number } {
  let dra = p.ra - center.ra;
  if (dra > 180) dra -= 360;
  if (dra < -180) dra += 360;
  return { dx: dra * Math.cos(center.dec * D2R) * 3600, dy: (p.dec - center.dec) * 3600 };
}

export function separationArcsec(a: SkyPos, b: SkyPos): number {
  const o = skyToOffset(a, b);
  return Math.hypot(o.dx, o.dy);
}

// ICRS (J2000) to Galactic rotation matrix.
const GAL = [
  [-0.0548755604162154, -0.873437090234885, -0.4838350155487132],
  [0.4941094278755837, -0.4448296299600112, 0.7469822444972189],
  [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669],
];

export function toGalactic(p: SkyPos): { l: number; b: number } {
  const ra = p.ra * D2R;
  const dec = p.dec * D2R;
  const v = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const g = GAL.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
  return { l: wrapRa(Math.atan2(g[1], g[0]) * R2D), b: Math.asin(Math.max(-1, Math.min(1, g[2]))) * R2D };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "10h 52m 04.2s" */
export function formatRa(raDeg: number): string {
  const tenths = Math.round((wrapRa(raDeg) / 15) * 3600 * 10) % 864000;
  const h = Math.floor(tenths / 36000);
  const m = Math.floor((tenths % 36000) / 600);
  const s = (tenths % 600) / 10;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(1).padStart(4, '0')}s`;
}

/** "+57° 28′ 11″" */
export function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? '−' : '+';
  const total = Math.round(Math.abs(decDeg) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${sign}${pad2(d)}° ${pad2(m)}′ ${pad2(s)}″`;
}

export function formatGalactic(p: SkyPos): string {
  const { l, b } = toGalactic(p);
  return `l ${l.toFixed(3)}° · b ${b >= 0 ? '+' : '−'}${Math.abs(b).toFixed(3)}°`;
}

export function formatArcsec(v: number, digits = 1): string {
  return `${v.toFixed(digits)}″`;
}

export function formatSigned(v: number, digits = 1, unit = '%'): string {
  const sign = v < 0 ? '−' : '+';
  return `${sign}${Math.abs(v).toFixed(digits)}${unit}`;
}

export function padId(id: number): string {
  return String(id).padStart(3, '0');
}
