/**
 * Colour tokens.
 *
 * Four anchors, everything else mixed from them:
 *   #0D0D0D  near-black   dark canvas
 *   #1E466B  deep blue    borders, active controls, light-mode accent
 *   #67BAF4  sky blue     dark-mode accent, light-mode highlight
 *   #FAFAFA  near-white   dark ink, light canvas
 *
 * `src/index.css` holds the same values as CSS custom properties and
 * `src/test/palette.test.ts` fails if the two drift apart.
 *
 * Charts and canvases cannot read CSS variables, so they take a palette
 * object from `paletteFor(theme)` instead.
 */
export type Theme = 'dark' | 'light';

export const paletteDark = {
  field: '#0d0d0d',
  bar: '#0d0d0d',
  panel: '#13171e',
  panel2: '#19212b',

  line: '#1e466b66',
  line2: '#1e466b',

  ink: '#fafafa',
  mist: '#cbd5e1',
  haze: '#94a3b8',
  slate: '#64748b',

  accent: '#67baf4',
  accentSoft: '#a9d8fa',
  accent2: '#4a8cbd',
  star: '#e3eef8',
  warn: '#f59e0b',
} as const;

export const paletteLight = {
  field: '#fafafa',
  bar: '#fafafa',
  panel: '#ffffff',
  panel2: '#f1f5f9',

  line: '#e2e8f0',
  line2: '#cbd5e1',

  ink: '#0d0d0d',
  mist: '#334155',
  haze: '#64748b',
  slate: '#94a3b8',

  accent: '#1e466b',
  accentSoft: '#67baf4',
  accent2: '#67baf4',
  star: '#475569',
  warn: '#b45309',
} as const;

export type Palette = typeof paletteDark;

/** Dark palette. Static default for code paths that cannot subscribe to the theme. */
export const palette = paletteDark;

export function paletteFor(theme: Theme): Palette {
  return theme === 'light' ? paletteLight : paletteDark;
}

export interface ChartPalette {
  axis: string;
  grid: string;
  ticks: string;
  candidate: string;
  flagged: string;
  median: string;
  flaggedFill: string;
  bandRangeFill: string;
  bandRangeStroke: string;
  cursor: string;
}

export function chartFor(theme: Theme): ChartPalette {
  return theme === 'light'
    ? {
        axis: paletteLight.haze,
        grid: '#e2e8f0',
        ticks: '#cbd5e1',
        candidate: '#94a3b8',
        flagged: paletteLight.accent,
        median: paletteLight.ink,
        flaggedFill: 'rgba(30, 70, 107, 0.10)',
        bandRangeFill: 'rgba(13, 13, 13, 0.05)',
        bandRangeStroke: paletteLight.accent,
        cursor: paletteLight.haze,
      }
    : {
        axis: paletteDark.haze,
        grid: '#1a2430',
        ticks: '#1e466b',
        candidate: '#355b75',
        flagged: paletteDark.accent,
        median: paletteDark.ink,
        flaggedFill: 'rgba(103, 186, 244, 0.12)',
        bandRangeFill: 'rgba(250, 250, 250, 0.08)',
        bandRangeStroke: paletteDark.ink,
        cursor: paletteDark.haze,
      };
}

export const chart = chartFor('dark');

export interface SkyPalette {
  backdrop: string;
  grid: string;
  gridMajor: string;
  gridLabel: string;
  scaleBar: string;
  constellation: string;
  vector: string;
}

export function skyFor(theme: Theme): SkyPalette {
  return theme === 'light'
    ? {
        backdrop: 'radial-gradient(ellipse at 42% 38%, #ffffff 0%, #f4f6f9 72%)',
        grid: 'rgba(30, 70, 107, 0.12)',
        gridMajor: 'rgba(30, 70, 107, 0.24)',
        gridLabel: '#64748b',
        scaleBar: '#64748b',
        constellation: 'rgba(30, 70, 107, 0.22)',
        vector: '#1e466b',
      }
    : {
        backdrop: 'radial-gradient(ellipse at 42% 38%, #111820 0%, #0a0a0a 72%)',
        grid: 'rgba(103, 186, 244, 0.12)',
        gridMajor: 'rgba(103, 186, 244, 0.24)',
        gridLabel: '#7a8c9c',
        scaleBar: '#94a3b8',
        constellation: 'rgba(103, 186, 244, 0.18)',
        vector: '#f59e0b',
      };
}

export const sky = skyFor('dark');
