import type { Ref } from 'react';
import type { SkyPos } from '@/lib/coords';
import type { FieldInfo } from '@/data/types';
import type { SkyItem } from '@/lib/skyItems';

/** Imperative controls both sky renderers expose, so the zoom buttons work with either. */
export interface SkyHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  centerOn: (pos: SkyPos | null) => void;
}

export interface SkyRendererProps {
  field: FieldInfo;
  items: SkyItem[];
  onSelect: (candidateId: number) => void;
  showGrid?: boolean;
  showConstellations?: boolean;
  ref?: Ref<SkyHandle>;
}
