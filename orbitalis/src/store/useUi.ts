import { create } from 'zustand';
import { DEFAULT_WEIGHTS, type Weights } from '@/lib/scoring';
import type { EpochId } from '@/data/types';

export type ClassFilter = 'all' | 'moving' | 'variable';
export type Frame = 'equatorial' | 'galactic';
export type Renderer = 'auto' | 'aladin' | 'svg';

export interface LayerVisibility {
  stationary: boolean;
  moving: boolean;
  variable: boolean;
}

interface UiState {
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
}

function initialRenderer(): Renderer {
  if (typeof window === 'undefined') return 'auto';
  const r = new URLSearchParams(window.location.search).get('renderer');
  return r === 'svg' || r === 'aladin' ? r : 'auto';
}

export const useUi = create<UiState>((set) => ({
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

  setEpoch: (epoch) => set({ epoch }),
  stepEpoch: () => set((s) => ({ epoch: ((s.epoch % 3) + 1) as EpochId })),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  select: (selectedId) => set({ selectedId }),
  setTrails: (trails) => set({ trails }),
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
}));
