import { create } from 'zustand';
import { DEFAULT_WEIGHTS, type Weights } from '@/lib/scoring';
import type { EpochId } from '@/data/types';

export type ClassFilter = 'all' | 'moving' | 'variable';
export type Frame = 'equatorial' | 'galactic';
export type Renderer = 'auto' | 'aladin' | 'svg';
export type Theme = 'dark' | 'light';
export type TempMode = 'epoch' | 'trails' | 'tempdiff';
export type RailFilter = 'all' | 'moving' | 'flux' | 'top';

export interface LayerVisibility {
  stationary: boolean;
  moving: boolean;
  variable: boolean;
}

interface UiState {
  theme: Theme;
  epoch: EpochId;
  /** True while the timeline is looping through the epochs. */
  playing: boolean;
  selectedId: number | null;
  trails: boolean;
  /** Visual exaggeration of motion between epochs. Real shifts are often sub-pixel. */
  motionGain: number;
  frame: Frame;
  renderer: Renderer;
  /** Real-sky imagery behind the synthetic sources (Aladin only). Off by default. */
  backdrop: boolean;
  layers: LayerVisibility;
  classFilter: ClassFilter;
  hideKnown: boolean;
  weights: Weights;
  /** Selected band range, 1-indexed inclusive, or null for all 102 bands. */
  bandRange: [number, number] | null;
  queueCollapsed: boolean;
  railOpen: boolean;
  dossierOpen: boolean;
  tempMode: TempMode;
  railFilter: RailFilter;
  showGrid: boolean;
  showConstellations: boolean;
  showAnchorStars: boolean;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setEpoch: (e: EpochId) => void;
  stepEpoch: () => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  select: (id: number | null) => void;
  setTrails: (v: boolean) => void;
  setMotionGain: (v: number) => void;
  setFrame: (f: Frame) => void;
  setRenderer: (r: Renderer) => void;
  setBackdrop: (v: boolean) => void;
  toggleLayer: (k: keyof LayerVisibility) => void;
  setClassFilter: (f: ClassFilter) => void;
  setHideKnown: (v: boolean) => void;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  setBandRange: (r: [number, number] | null) => void;
  toggleQueue: () => void;
  toggleRail: () => void;
  setDossierOpen: (v: boolean) => void;
  toggleDossier: () => void;
  setTempMode: (m: TempMode) => void;
  setRailFilter: (f: RailFilter) => void;
  setShowGrid: (v: boolean) => void;
  setShowConstellations: (v: boolean) => void;
  setShowAnchorStars: (v: boolean) => void;
}

function initialRenderer(): Renderer {
  if (typeof window === 'undefined') return 'auto';
  const r = new URLSearchParams(window.location.search).get('renderer');
  return r === 'svg' || r === 'aladin' ? r : 'auto';
}

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem('orbitalis-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('orbitalis-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useUi = create<UiState>((set) => ({
  theme: initialTheme(),
  epoch: 2,
  playing: false,
  selectedId: 42,
  trails: true,
  motionGain: 25,
  frame: 'equatorial',
  renderer: initialRenderer(),
  backdrop: false,
  layers: { stationary: true, moving: true, variable: true },
  classFilter: 'all',
  hideKnown: false,
  weights: { ...DEFAULT_WEIGHTS },
  bandRange: null,
  queueCollapsed: false,
  railOpen: true,
  dossierOpen: true,
  tempMode: 'epoch',
  railFilter: 'all',
  showGrid: true,
  showConstellations: true,
  showAnchorStars: true,

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      return { theme };
    }),
  setEpoch: (epoch) => set({ epoch }),
  stepEpoch: () => set((s) => ({ epoch: ((s.epoch % 6) + 1) as EpochId })),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  select: (selectedId) => set({ selectedId }),
  setTrails: (trails) => set({ trails, tempMode: trails ? 'trails' : 'epoch' }),
  setMotionGain: (motionGain) => set({ motionGain }),
  setFrame: (frame) => set({ frame }),
  setRenderer: (renderer) => set({ renderer }),
  setBackdrop: (backdrop) => set({ backdrop }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setClassFilter: (classFilter) => set({ classFilter }),
  setHideKnown: (hideKnown) => set({ hideKnown }),
  setWeights: (weights) => set({ weights }),
  resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
  setBandRange: (bandRange) => set({ bandRange }),
  toggleQueue: () => set((s) => ({ queueCollapsed: !s.queueCollapsed })),
  toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),
  setDossierOpen: (dossierOpen) => set({ dossierOpen }),
  toggleDossier: () => set((s) => ({ dossierOpen: !s.dossierOpen })),
  setTempMode: (tempMode) =>
    set({
      tempMode,
      trails: tempMode === 'trails' || tempMode === 'tempdiff',
    }),
  setRailFilter: (railFilter) => set({ railFilter }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowConstellations: (showConstellations) => set({ showConstellations }),
  setShowAnchorStars: (showAnchorStars) => set({ showAnchorStars }),
}));
