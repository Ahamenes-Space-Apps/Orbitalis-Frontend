export interface ConstellationLine {
  name: string;
  points: { dx: number; dy: number }[];
}

/**
 * Sparse IAU-style guide lines around the validation field centre.
 * Coordinates are tangent-plane offsets in arcseconds so the overlay stays
 * aligned with both the SVG and Aladin renderers.
 */
export const CONSTELLATIONS: ConstellationLine[] = [
  {
    name: 'Camelopardalis',
    points: [
      { dx: -480, dy: 260 },
      { dx: -300, dy: 330 },
      { dx: -180, dy: 210 },
      { dx: -40, dy: 280 },
      { dx: 90, dy: 190 },
    ],
  },
  {
    name: 'Ursa Major',
    points: [
      { dx: 120, dy: -420 },
      { dx: 250, dy: -330 },
      { dx: 410, dy: -360 },
      { dx: 520, dy: -220 },
      { dx: 390, dy: -120 },
      { dx: 250, dy: -180 },
      { dx: 250, dy: -330 },
    ],
  },
  {
    name: 'Draco',
    points: [
      { dx: -520, dy: -160 },
      { dx: -420, dy: -280 },
      { dx: -260, dy: -260 },
      { dx: -190, dy: -380 },
      { dx: -60, dy: -330 },
    ],
  },
  {
    name: 'Auriga',
    points: [
      { dx: 210, dy: 400 },
      { dx: 330, dy: 470 },
      { dx: 450, dy: 390 },
      { dx: 400, dy: 270 },
      { dx: 280, dy: 300 },
      { dx: 330, dy: 470 },
    ],
  },
];
