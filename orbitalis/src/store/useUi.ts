import { create } from 'zustand';
import { DEFAULT_WEIGHTS, type Weights } from '@/lib/scoring';
import type { Theme } from '@/lib/palette';
import type { EpochId } from '@/data/types';

export type ClassFilter = 'all' | 'moving' | 'variable' | 'top';
export type Frame = 'equatorial' | 'galactic';
export type Renderer = 'auto' | 'aladin' | 'svg';
export type ViewMode = 'epoch' | 'trails' | 'tempDiff';

export interface LayerVisibility {
  stationary: boolean;
  moving: boolean;
  variable: boolean;
}

const THEME_KEY = 'orbitalis-theme';

function storedTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Keep the DOM class and the browser chrome in step with the store. */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'light' ? '#fafafa' : '#0d0d0d');
}

interface UiState {
  theme: Theme;
  epoch: EpochId;
  /** True while the timeline is looping through the epochs. */
  playing: boolean;
  selectedId: number | null;
  trails: boolean;
  /** Epoch | Trails | Temp Diff, used by the temporal difference engine. */
  viewMode: ViewMode;
  /** Visual exaggeration of motion between epochs. Real shifts are often sub-pixel. */
  motionGain: number;
  frame: Frame;
  renderer: Renderer;
  /** Real-sky imagery behind the synthetic sources (Aladin only). Off by default. */
  backdrop: boolean;
  layers: LayerVisibility;
  /** Display overlays on the sky map. */
  grid: boolean;
  constellations: boolean;
  anchors: boolean;
  classFilter: ClassFilter;
  hideKnown: boolean;
  search: string;
  minScore: number;
  weights: Weights;
  /** Selected band range, 1-indexed inclusive, or null for all 102 bands. */
  bandRange: [number, number] | null;
  queueCollapsed: boolean;
  /** Mobile candidate drawer. */
  railOpen: boolean;
  dossierOpen: boolean;
  dockOpen: boolean;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setEpoch: (e: EpochId) => void;
  stepEpoch: () => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  select: (id: number | null) => void;
  setTrails: (v: boolean) => void;
  setViewMode: (m: ViewMode) => void;
  setMotionGain: (v: number) => void;
  setFrame: (f: Frame) => void;
  setRenderer: (r: Renderer) => void;
  setBackdrop: (v: boolean) => void;
  toggleLayer: (k: keyof LayerVisibility) => void;
  toggleGrid: () => void;
  toggleConstellations: () => void;
  toggleAnchors: () => void;
  setClassFilter: (f: ClassFilter) => void;
  setHideKnown: (v: boolean) => void;
  setSearch: (v: string) => void;
  setMinScore: (v: number) => void;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  setBandRange: (r: [number, number] | null) => void;
  toggleQueue: () => void;
  setRailOpen: (v: boolean) => void;
  toggleRail: () => void;
  toggleDossier: () => void;
  toggleDock: () => void;
}

function initialRenderer(): Renderer {
  if (typeof window === 'undefined') return 'auto';
  const r = new URLSearchParams(window.location.search).get('renderer');
  return r === 'svg' || r === 'aladin' ? r : 'auto';
}

const bootTheme = typeof window === 'undefined' ? 'dark' : storedTheme();
applyTheme(bootTheme);

export const useUi = create<UiState>((set) => ({
  theme: bootTheme,
  epoch: 2,
  playing: false,
  selectedId: 42,
  trails: true,
  viewMode: 'epoch',
  motionGain: 25,
  frame: 'equatorial',
  renderer: initialRenderer(),
  backdrop: false,
  layers: { stationary: true, moving: true, variable: true },
  grid: true,
  constellations: false,
  anchors: false,
  classFilter: 'all',
  hideKnown: false,
  search: '',
  minScore: 0,
  weights: { ...DEFAULT_WEIGHTS },
  bandRange: null,
  queueCollapsed: false,
  railOpen: false,
  dossierOpen: true,
  dockOpen: true,

  setTheme: (theme) => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode or storage disabled */
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try {
        window.localStorage.setItem(THEME_KEY, theme);
      } catch {
        /* private mode or storage disabled */
      }
      return { theme };
    }),
  setEpoch: (epoch) => set({ epoch, playing: false }),
  stepEpoch: () => set((s) => ({ epoch: ((s.epoch % 3) + 1) as EpochId })),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  select: (selectedId) => set({ selectedId }),
  setTrails: (trails) => set({ trails }),
  setViewMode: (viewMode) =>
    set({ viewMode, trails: viewMode === 'epoch' ? false : true }),
  setMotionGain: (motionGain) => set({ motionGain }),
  setFrame: (frame) => set({ frame }),
  setRenderer: (renderer) => set({ renderer }),
  setBackdrop: (backdrop) => set({ backdrop }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  toggleGrid: () => set((s) => ({ grid: !s.grid })),
  toggleConstellations: () => set((s) => ({ constellations: !s.constellations })),
  toggleAnchors: () => set((s) => ({ anchors: !s.anchors })),
  setClassFilter: (classFilter) => set({ classFilter }),
  setHideKnown: (hideKnown) => set({ hideKnown }),
  setSearch: (search) => set({ search }),
  setMinScore: (minScore) => set({ minScore }),
  setWeights: (weights) => set({ weights }),
  resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
  setBandRange: (bandRange) => set({ bandRange }),
  toggleQueue: () => set((s) => ({ queueCollapsed: !s.queueCollapsed })),
  setRailOpen: (railOpen) => set({ railOpen }),
  toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),
  toggleDossier: () => set((s) => ({ dossierOpen: !s.dossierOpen })),
  toggleDock: () => set((s) => ({ dockOpen: !s.dockOpen })),
}));
