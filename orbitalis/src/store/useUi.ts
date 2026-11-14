/**
 * Local UI state only (UX §14.1). Navigation, selection, frame, view, system,
 * exaggeration and layers live in the URL; everything here is ephemeral.
 */

import { create } from 'zustand';
import type { SkyPos } from '@/lib/coords';

export type CandidateSort = 'rank' | 'rate' | 'ordinal';

interface UiState {
  queueCollapsed: boolean;
  drawerOpen: boolean;
  fieldEntryOpen: boolean;
  playing: boolean;
  speed: number;
  showFlags: boolean;
  sortBy: CandidateSort;
  hoveredCandidateId: string | null;
  cursor: SkyPos | null;

  toggleQueue: () => void;
  setDrawerOpen: (open: boolean) => void;
  setFieldEntryOpen: (open: boolean) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setShowFlags: (show: boolean) => void;
  setSortBy: (sort: CandidateSort) => void;
  setHoveredCandidateId: (id: string | null) => void;
  setCursor: (position: SkyPos | null) => void;
}

export const useUi = create<UiState>((set) => ({
  queueCollapsed: false,
  drawerOpen: false,
  fieldEntryOpen: false,
  playing: false,
  speed: 2,
  showFlags: false,
  sortBy: 'rank',
  hoveredCandidateId: null,
  cursor: null,

  toggleQueue: () => set((state) => ({ queueCollapsed: !state.queueCollapsed })),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setFieldEntryOpen: (fieldEntryOpen) => set({ fieldEntryOpen }),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((state) => ({ playing: !state.playing })),
  setSpeed: (speed) => set({ speed }),
  setShowFlags: (showFlags) => set({ showFlags }),
  setSortBy: (sortBy) => set({ sortBy }),
  setHoveredCandidateId: (hoveredCandidateId) => set({ hoveredCandidateId }),
  setCursor: (cursor) => set({ cursor }),
}));
