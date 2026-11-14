/**
 * URL state (UX §4.3). Navigation and the selected view live in the address so
 * a copied link reproduces the screen. Stream and job progress never do.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export type ViewMode = 'simple' | 'aladin';
export type CoordinateSystem = 'eq' | 'gal';
export type LayerName = 'moving' | 'static' | 'known' | 'hypothesis' | 'trails';

export interface UrlValues {
  ra: number | null;
  dec: number | null;
  r: number;
  rel: string | null;
  f: string | null;
  t: string | null;
  sel: string | null;
  view: ViewMode;
  sys: CoordinateSystem;
  exag: number;
  layers: LayerName[];
}

export const DEFAULT_LAYERS: LayerName[] = ['moving', 'trails'];

const numberOrNull = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function parseLayers(value: string | null): LayerName[] {
  if (value === null) return DEFAULT_LAYERS;
  if (value.trim() === '') return [];
  const allowed: LayerName[] = ['moving', 'static', 'known', 'hypothesis', 'trails'];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is LayerName => (allowed as string[]).includes(part));
}

export function readUrlValues(params: URLSearchParams): UrlValues {
  return {
    ra: numberOrNull(params.get('ra')),
    dec: numberOrNull(params.get('dec')),
    r: numberOrNull(params.get('r')) ?? 0.1,
    rel: params.get('rel'),
    f: params.get('f'),
    t: params.get('t'),
    sel: params.get('sel'),
    view: params.get('view') === 'aladin' ? 'aladin' : 'simple',
    sys: params.get('sys') === 'gal' ? 'gal' : 'eq',
    exag: Math.max(1, Math.min(100, numberOrNull(params.get('exag')) ?? 25)),
    layers: parseLayers(params.get('layers')),
  };
}

export interface UrlState {
  values: UrlValues;
  update: (patch: Partial<UrlValues>, options?: { replace?: boolean }) => void;
  remove: (keys: Array<keyof UrlValues>, options?: { replace?: boolean }) => void;
  /** Navigate to a field: coordinates, release and the optional resolved id. */
  openField: (values: {
    f?: string | null;
    ra: number;
    dec: number;
    r?: number;
    rel?: string | null;
  }) => void;
}

const UrlContext = createContext<UrlState | null>(null);

export function UrlStateProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = useMemo(() => readUrlValues(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<UrlValues>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      const put = (key: string, value: string | number | null | undefined) => {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      };
      if ('ra' in patch) put('ra', patch.ra);
      if ('dec' in patch) put('dec', patch.dec);
      if ('r' in patch) put('r', patch.r);
      if ('rel' in patch) put('rel', patch.rel);
      if ('f' in patch) put('f', patch.f);
      if ('t' in patch) put('t', patch.t);
      if ('sel' in patch) put('sel', patch.sel);
      if ('view' in patch) put('view', patch.view);
      if ('sys' in patch) put('sys', patch.sys);
      if ('exag' in patch) put('exag', patch.exag);
      if ('layers' in patch) {
        if (!patch.layers) next.delete('layers');
        else next.set('layers', patch.layers.join(','));
      }
      setSearchParams(next, { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );

  const remove = useCallback(
    (keys: Array<keyof UrlValues>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      keys.forEach((key) => next.delete(key));
      setSearchParams(next, { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );

  const openField = useCallback(
    (target: { f?: string | null; ra: number; dec: number; r?: number; rel?: string | null }) => {
      const next = new URLSearchParams(searchParams);
      next.set('ra', String(Number(target.ra.toFixed(6))));
      next.set('dec', String(Number(target.dec.toFixed(6))));
      next.set('r', String(target.r ?? 0.1));
      if (target.rel) next.set('rel', target.rel);
      else next.delete('rel');
      if (target.f) next.set('f', target.f);
      else next.delete('f');
      next.delete('t');
      next.delete('sel');
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  const value = useMemo<UrlState>(
    () => ({ values, update, remove, openField }),
    [values, update, remove, openField],
  );

  return <UrlContext.Provider value={value}>{children}</UrlContext.Provider>;
}

export function useUrlState(): UrlState {
  const context = useContext(UrlContext);
  if (!context) throw new Error('useUrlState must be used inside UrlStateProvider');
  return context;
}

/** Keep a link on the current tab but with the current URL state. */
export function useSearchPreservingPath() {
  const location = useLocation();
  return useCallback(
    (pathname: string) => ({ pathname, search: location.search }),
    [location.search],
  );
}
