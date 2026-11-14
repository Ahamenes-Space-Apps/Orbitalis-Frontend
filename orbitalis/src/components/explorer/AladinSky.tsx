import { useEffect, useRef } from 'react';
import type { CandidateSummary, Field } from '@/data/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Aladin Lite background context. Optional: the offline Simple view is the
 * default, and any failure falls back to it without losing the field or
 * selection.
 */
export function AladinSky({
  field,
  candidates,
  selectedId,
  onSelect,
  onFailed,
}: {
  field: Field;
  candidates: CandidateSummary[];
  selectedId: string | null;
  onSelect: (candidateId: string | null) => void;
  onFailed: (reason: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<any>(null);
  const catalogRef = useRef<any>(null);
  const aladinModule = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onFailedRef.current = onFailed;
  });

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    const pixelsToDegrees = (field.grid.width * field.grid.pixel_scale_arcsec) / 3600;

    (async () => {
      try {
        const mod: any = await import('aladin-lite');
        const A: any = mod.default ?? mod;
        await A.init;
        if (disposed || !host) return;

        const aladin = A.aladin(host, {
          survey: 'P/DSS2/color',
          fov: Math.max(0.05, pixelsToDegrees * 1.35),
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
          backgroundColor: 'rgba(10, 15, 28, 1)',
          log: false,
        });
        aladin.gotoRaDec(field.grid.ra, field.grid.dec);

        const draw = (source: any, ctx: CanvasRenderingContext2D) => {
          const x = source?.x;
          const y = source?.y;
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          const selected = source?.data?.selected === true;
          const color = '#feb832';
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = selected ? 2.5 : 1.6;
          ctx.beginPath();
          ctx.arc(x, y, selected ? 16 : 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '12px "IBM Plex Mono", monospace';
          ctx.fillText(String(source?.data?.label ?? ''), x + (selected ? 19 : 15), y + 4);
          ctx.restore();
        };

        const catalog = A.catalog({ name: 'Unconfirmed candidates', sourceSize: 18, shape: draw });
        aladin.addCatalog(catalog);
        aladin.on('objectClicked', (object: any) => {
          const id = object?.data?.id;
          if (typeof id === 'string') onSelectRef.current(id);
        });

        aladinModule.current = A;
        aladinRef.current = aladin;
        catalogRef.current = catalog;
      } catch (error) {
        if (!disposed) {
          onFailedRef.current(error instanceof Error ? error.message : String(error));
        }
      }
    })();

    return () => {
      disposed = true;
      aladinRef.current = null;
      catalogRef.current = null;
      aladinModule.current = null;
      if (host) host.innerHTML = '';
    };
    // The instance is created once per field; new data is pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.field_id]);

  useEffect(() => {
    const A = aladinModule.current;
    const catalog = catalogRef.current;
    if (!A || !catalog) return;
    try {
      catalog.removeAll();
      catalog.addSources(
        candidates.map((candidate) =>
          A.source(candidate.position.ra, candidate.position.dec, {
            id: candidate.candidate_id,
            label: candidate.ordinal ? `#${String(candidate.ordinal).padStart(3, '0')}` : '#',
            selected: candidate.candidate_id === selectedId,
          }),
        ),
      );
    } catch (error) {
      onFailedRef.current(error instanceof Error ? error.message : String(error));
    }
  }, [candidates, selectedId]);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" data-testid="sky-aladin" />
    </div>
  );
}
