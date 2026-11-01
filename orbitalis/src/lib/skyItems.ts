import type { SkyPos } from '@/lib/coords';
import type { CandidateSummary, EpochId, StationarySource } from '@/data/types';
import type { LayerVisibility } from '@/store/useUi';

export type SkyItemKind = 'star' | 'moving' | 'variable' | 'ghost';

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
  /** 0 to 1, for trail ghosts. */
  alpha?: number;
}

export interface BuildSkyArgs {
  stationary: StationarySource[];
  candidates: CandidateSummary[];
  epoch: EpochId;
  gain: number;
  trails: boolean;
  selectedId: number | null;
  layers: LayerVisibility;
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
  if (a.layers.stationary) {
    for (const s of a.stationary) items.push({ key: s.id, kind: 'star', ra: s.ra, dec: s.dec });
  }
  for (const c of a.candidates) {
    const visible = c.cls === 'moving' ? a.layers.moving : a.layers.variable;
    if (!visible) continue;
    const label = String(c.id).padStart(3, '0');
    if (a.trails && c.cls === 'moving') {
      for (let k = 0; k < a.epoch - 1; k++) {
        const g = exaggerated(c.positions, k, a.gain);
        items.push({ key: `g${c.id}-${k}`, kind: 'ghost', ra: g.ra, dec: g.dec, alpha: 0.3 + 0.2 * k });
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
    });
  }
  return items;
}

export const KIND_COLOR: Record<SkyItemKind, string> = {
  star: '#CFE0FF',
  moving: '#F2B544',
  variable: '#A596FF',
  ghost: '#F2B544',
};
