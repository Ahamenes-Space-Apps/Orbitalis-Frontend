import type { SkyPos } from '@/lib/coords';
import type { CandidateSummary, EpochId, StationarySource } from '@/data/types';
import type { LayerVisibility, TempMode } from '@/store/useUi';

export type SkyItemKind = 'star' | 'moving' | 'variable' | 'ghost' | 'vector';

export interface SkyItem {
  key: string;
  kind: SkyItemKind;
  ra: number;
  dec: number;
  /** Candidate id, for clickable items. */
  cid?: number;
  label?: string;
  selected?: boolean;
  known?: boolean;
  /** 0 to 1, for trails, baseline ghosts and dimmed field stars. */
  alpha?: number;
  /** End point for displacement vectors. */
  ra2?: number;
  dec2?: number;
}

export interface BuildSkyArgs {
  stationary: StationarySource[];
  candidates: CandidateSummary[];
  epoch: EpochId;
  gain: number;
  trails: boolean;
  selectedId: number | null;
  layers: LayerVisibility;
  tempMode?: TempMode;
  showAnchorStars?: boolean;
}

/** Position of epoch k with the displacement from epoch 1 multiplied by `gain`. */
export function exaggerated(positions: SkyPos[], k: number, gain: number): SkyPos {
  const p1 = positions[0];
  const pk = positions[Math.min(k, positions.length - 1)];
  let dra = pk.ra - p1.ra;
  if (dra > 180) dra -= 360;
  if (dra < -180) dra += 360;
  return { ra: p1.ra + dra * gain, dec: p1.dec + (pk.dec - p1.dec) * gain };
}

export function buildSkyItems(a: BuildSkyArgs): SkyItem[] {
  const items: SkyItem[] = [];
  const tempDiff = a.tempMode === 'tempdiff';

  if (a.layers.stationary) {
    a.stationary.forEach((s, i) => {
      const anchor = i % 29 === 0;
      if (anchor && a.showAnchorStars === false) return;
      items.push({
        key: s.id,
        kind: 'star',
        ra: s.ra,
        dec: s.dec,
        alpha: tempDiff ? 0.25 : anchor ? 0.95 : 0.55,
        label: anchor ? s.id : undefined,
      });
    });
  }

  for (const c of a.candidates) {
    const visible = c.cls === 'moving' ? a.layers.moving : a.layers.variable;
    if (!visible) continue;
    const label = String(c.id).padStart(3, '0');
    const trailMode = a.trails || a.tempMode === 'trails' || tempDiff;

    if (trailMode && c.cls === 'moving') {
      if (tempDiff) {
        const base = exaggerated(c.positions, 0, a.gain);
        items.push({ key: `g${c.id}-base`, kind: 'ghost', ra: base.ra, dec: base.dec, alpha: 0.5 });
      } else {
        for (let k = 0; k < a.epoch - 1; k++) {
          const g = exaggerated(c.positions, k, a.gain);
          items.push({ key: `g${c.id}-${k}`, kind: 'ghost', ra: g.ra, dec: g.dec, alpha: 0.24 + 0.12 * k });
        }
      }
    }

    const p = exaggerated(c.positions, a.epoch - 1, a.gain);
    items.push({
      key: `c${c.id}`,
      kind: c.cls,
      ra: p.ra,
      dec: p.dec,
      cid: c.id,
      label: c.knownMatch ? `${label} · known` : label,
      selected: c.id === a.selectedId,
      known: c.knownMatch !== null,
      alpha: tempDiff ? 1 : undefined,
    });

    if (tempDiff && c.cls === 'moving') {
      const base = exaggerated(c.positions, 0, a.gain);
      items.push({
        key: `v${c.id}`,
        kind: 'vector',
        ra: base.ra,
        dec: base.dec,
        ra2: p.ra,
        dec2: p.dec,
        cid: c.id,
        selected: c.id === a.selectedId,
        alpha: 0.85,
      });
    }
  }

  return items;
}

export const KIND_COLOR: Record<SkyItemKind, string> = {
  star: '#cfe0ff',
  moving: '#67baf4',
  variable: '#f59e0b',
  ghost: '#67baf4',
  vector: '#67baf4',
};
