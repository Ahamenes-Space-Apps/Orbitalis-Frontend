/**
 * Client-side coordinate parsing (UX §5.1). Names are not resolved here;
 * the current API has no `/resolve`, so the entry screen says so instead of
 * showing a control that cannot work.
 */

export interface ParsedCoordinates {
  ra: number;
  dec: number;
}

const RA_HMS = /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:'\s]\s*(\d{1,2}(?:\.\d+)?)\s*s?$/i;
const DEC_DMS = /^([+-]?\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m′':\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s″"]?$/i;

function parseHms(value: string): number | null {
  const match = value.trim().match(RA_HMS);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (hours > 24 || minutes > 59 || seconds >= 60) return null;
  return (hours + minutes / 60 + seconds / 3600) * 15;
}

function parseDms(value: string): number | null {
  const match = value.trim().match(DEC_DMS);
  if (!match) return null;
  const sign = value.trim().startsWith('-') ? -1 : 1;
  const degrees = Math.abs(Number(match[1]));
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (degrees > 90 || minutes > 59 || seconds >= 60) return null;
  return sign * (degrees + minutes / 60 + seconds / 3600);
}

/** Accepts `163.017 57.469`, `163.017, +57.469`, `10h52m04s +57d28m11s`. */
export function parseCoordinates(input: string): ParsedCoordinates | null {
  const text = input.trim();
  if (!text) return null;

  const sexagesimal = text.match(/^(\S+(?:\s+[hms]\S*)?)\s*[, ]\s*(\S+)$/i);
  if (sexagesimal) {
    const ra = parseHms(sexagesimal[1]);
    const dec = parseDms(sexagesimal[2]);
    if (ra !== null && dec !== null) return { ra, dec };
  }

  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 2) {
    const ra = Number(parts[0]);
    const dec = Number(parts[1]);
    if (Number.isFinite(ra) && Number.isFinite(dec)) {
      if (ra < 0 || ra >= 360 || dec < -90 || dec > 90) return null;
      return { ra, dec };
    }
  }
  return null;
}
