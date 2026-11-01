import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { KIND_COLOR } from '@/lib/skyItems';
import { useUi } from '@/store/useUi';
import type { SkyRendererProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Custom Aladin Lite shape. Aladin calls this for every catalog source it draws and gives us the
 * canvas context plus the source with its screen position in `x` and `y`. The kind (star, moving...) lives in `data`.
 */
function drawSource(source: any, ctx: CanvasRenderingContext2D) {
  const d = source?.data ?? {};
  const x: number = source?.x;
  const y: number = source?.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const color = KIND_COLOR[d.kind as keyof typeof KIND_COLOR] ?? KIND_COLOR.star;

  ctx.save();
  if (d.kind === 'star') {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
    ctx.fill();
  } else if (d.kind === 'ghost') {
    ctx.globalAlpha = d.alpha ?? 0.4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    const r = d.selected ? 17 : 12;
    if (d.selected) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r + 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = d.selected ? 2 : 1.5;
    ctx.setLineDash(d.kind === 'variable' ? [4, 3] : []);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(String(d.label ?? ''), x + r + 6, y + 4);
  }
  ctx.restore();
}

/**
 * Aladin Lite v3 sky view. The library is loaded lazily because it is large (it carries its WebAssembly core).
 * If anything fails (offline, no WebGL2, blocked), `onFailed` is called and the parent switches to the built-in view.
 */
export function AladinSky({
  field,
  items,
  onSelect,
  onFailed,
  ref,
}: SkyRendererProps & { onFailed: (reason: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<any>(null);
  const AladinRef = useRef<any>(null);
  const catalogRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  const onFailedRef = useRef(onFailed);
  const [ready, setReady] = useState(false);
  const backdrop = useUi((s) => s.backdrop);
  const frame = useUi((s) => s.frame);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onFailedRef.current = onFailed;
  });

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        try {
          const a = aladinRef.current;
          const f = a.getFoV();
          a.setFoV((Array.isArray(f) ? f[0] : f) / 1.4);
        } catch {
          /* ignore */
        }
      },
      zoomOut: () => {
        try {
          const a = aladinRef.current;
          const f = a.getFoV();
          a.setFoV((Array.isArray(f) ? f[0] : f) * 1.4);
        } catch {
          /* ignore */
        }
      },
      centerOn: (pos) => {
        try {
          const p = pos ?? field.center;
          aladinRef.current.gotoRaDec(p.ra, p.dec);
        } catch {
          /* ignore */
        }
      },
    }),
    [field.center],
  );

  // Create the Aladin instance once.
  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;

    (async () => {
      try {
        const mod: any = await import('aladin-lite');
        const A: any = mod.default ?? mod;
        await A.init;
        if (disposed || !host) return;

        const aladin = A.aladin(host, {
          survey: 'P/DSS2/color',
          fov: (field.fovArcmin / 60) * 1.15,
          cooFrame: 'equatorial',
          projection: 'SIN',
          showCooGrid: true,
          showCooGridControl: false,
          showZoomControl: false,
          showFullscreenControl: false,
          showLayersControl: false,
          showGotoControl: false,
          showSimbadPointerControl: false,
          showSettingsControl: false,
          showShareControl: false,
          showFrame: false,
          showCooLocation: false,
          showReticle: false,
          backgroundColor: 'rgba(10, 14, 23, 1)',
          log: false,
        });
        aladin.gotoRaDec(field.center.ra, field.center.dec);
        aladin.setFoV((field.fovArcmin / 60) * 1.15);

        const catalog = A.catalog({ name: 'ORBITALIS field', sourceSize: 18, shape: drawSource });
        aladin.addCatalog(catalog);
        aladin.on('objectClicked', (obj: any) => {
          const cid = obj?.data?.cid;
          if (typeof cid === 'number') onSelectRef.current(cid);
        });

        AladinRef.current = A;
        aladinRef.current = aladin;
        catalogRef.current = catalog;
        setReady(true);
      } catch (e) {
        if (!disposed) onFailedRef.current(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      disposed = true;
      aladinRef.current = null;
      catalogRef.current = null;
      AladinRef.current = null;
      if (host) host.innerHTML = '';
    };
    // The instance is created once per mount; field changes are handled by remounting the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw sources whenever the items change (epoch, gain, selection, layers).
  useEffect(() => {
    const A = AladinRef.current;
    const catalog = catalogRef.current;
    if (!ready || !A || !catalog) return;
    try {
      catalog.removeAll();
      catalog.addSources(
        items.map((it) =>
          A.source(it.ra, it.dec, {
            kind: it.kind,
            cid: it.cid,
            label: it.label,
            selected: it.selected,
            alpha: it.alpha,
          }),
        ),
      );
    } catch (e) {
      onFailedRef.current(e instanceof Error ? e.message : String(e));
    }
  }, [ready, items]);

  // The real-sky backdrop is hidden by default: the sources are synthetic and should not be read against real stars.
  useEffect(() => {
    if (!ready) return;
    const apply = () => {
      try {
        aladinRef.current?.getBaseImageLayer?.()?.setOpacity?.(backdrop ? 0.55 : 0);
      } catch {
        /* ignore */
      }
    };
    apply();
    const t = window.setTimeout(apply, 1200);
    return () => window.clearTimeout(t);
  }, [ready, backdrop]);

  useEffect(() => {
    if (!ready) return;
    try {
      aladinRef.current?.setFrame?.(frame === 'galactic' ? 'GAL' : 'ICRS');
    } catch {
      /* ignore */
    }
  }, [ready, frame]);

  // Aladin styles its container itself, so it gets a plain full-size child of the absolutely positioned wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" data-testid="sky-aladin" />
    </div>
  );
}
