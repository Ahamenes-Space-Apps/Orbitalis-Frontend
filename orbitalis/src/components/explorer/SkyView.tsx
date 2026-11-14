import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { api } from '@/data/api';
import type { CandidateSummary, Field, Frame, Overlay } from '@/data/types';
import { formatDec, formatGalactic, formatRa, formatWavelength } from '@/lib/format';
import { skyToOffset, toGalactic, type SkyPos } from '@/lib/coords';
import type { CoordinateSystem, LayerName } from '@/state/urlState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AladinSky } from './AladinSky';

export interface SkyMarker {
  candidate: CandidateSummary;
  position: SkyPos;
  selected: boolean;
  hovered: boolean;
  staticFlag: boolean;
}

interface SkyViewProps {
  field: Field;
  frames: Frame[];
  candidates: CandidateSummary[];
  selectedId: string | null;
  hoveredId: string | null;
  frame: Frame | null;
  view: 'simple' | 'aladin';
  sys: CoordinateSystem;
  layers: LayerName[];
  exag: number;
  showFlags: boolean;
  known: Overlay | undefined;
  hypothesis: Overlay | undefined;
  onSelect: (candidateId: string | null) => void;
  onHover: (candidateId: string | null) => void;
  onCursor: (position: SkyPos | null) => void;
  onSkyClick: (position: SkyPos) => void;
}

const CANDIDATE_COLOR = '#feb832';
const STATIC_COLOR = '#9aa3b8';
const KNOWN_COLOR = '#7b8499';
const HYPOTHESIS_COLOR = '#6cb6ff';

function frameMjd(frames: Frame[]): number | null {
  if (frames.length === 0) return null;
  return frames.reduce((min, item) => Math.min(min, item.mjd), Number.POSITIVE_INFINITY);
}

export function SkyView({
  field,
  frames,
  candidates,
  selectedId,
  hoveredId,
  frame,
  view,
  sys,
  layers,
  exag,
  showFlags,
  known,
  hypothesis,
  onSelect,
  onHover,
  onCursor,
  onSkyClick,
}: SkyViewProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [aladinFailed, setAladinFailed] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const grid = field.grid;
  const width = grid.width;
  const height = grid.height;
  const scale = grid.pixel_scale_arcsec;
  const firstMjd = frameMjd(frames);
  const currentFrame = frame ?? frames[0] ?? null;

  const toPixel = useCallback(
    (position: SkyPos): { x: number; y: number } => {
      const offset = skyToOffset({ ra: grid.ra, dec: grid.dec }, position);
      const angle = (-(grid.rotation_deg ?? 0) * Math.PI) / 180;
      const rotatedX = offset.dx * Math.cos(angle) - offset.dy * Math.sin(angle);
      const rotatedY = offset.dx * Math.sin(angle) + offset.dy * Math.cos(angle);
      return {
        x: width / 2 - rotatedX / scale,
        y: height / 2 - rotatedY / scale,
      };
    },
    [grid.dec, grid.ra, grid.rotation_deg, height, scale, width],
  );

  const fromPixel = useCallback(
    (x: number, y: number): SkyPos => {
      const dx = (width / 2 - x) * scale;
      const dy = (height / 2 - y) * scale;
      const angle = ((grid.rotation_deg ?? 0) * Math.PI) / 180;
      const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
      return {
        ra: grid.ra + rotatedX / 3600 / Math.cos((grid.dec * Math.PI) / 180),
        dec: grid.dec + rotatedY / 3600,
      };
    },
    [grid.dec, grid.ra, grid.rotation_deg, height, scale, width],
  );

  const markers = useMemo<SkyMarker[]>(() => {
    if (!currentFrame || firstMjd === null) {
      return candidates.map((candidate) => ({
        candidate,
        position: candidate.position,
        selected: candidate.candidate_id === selectedId,
        hovered: candidate.candidate_id === hoveredId,
        staticFlag: Boolean(candidate.static_source),
      }));
    }
    const dt = currentFrame.mjd - firstMjd;
    return candidates.map((candidate) => {
      const east = candidate.motion.mu_e_arcsec_per_day * dt * exag;
      const north = candidate.motion.mu_n_arcsec_per_day * dt * exag;
      return {
        candidate,
        position: {
          ra:
            candidate.position.ra +
            east / 3600 / Math.cos((candidate.position.dec * Math.PI) / 180),
          dec: candidate.position.dec + north / 3600,
        },
        selected: candidate.candidate_id === selectedId,
        hovered: candidate.candidate_id === hoveredId,
        staticFlag: Boolean(candidate.static_source),
      };
    });
  }, [candidates, currentFrame, exag, firstMjd, hoveredId, selectedId]);

  const selectedMarker = markers.find((marker) => marker.selected) ?? null;

  const viewBox = useMemo(() => {
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    const maxX = Math.max(0, width - viewWidth);
    const maxY = Math.max(0, height - viewHeight);
    const x = Math.min(maxX, Math.max(0, (width - viewWidth) / 2 + pan.x));
    const y = Math.min(maxY, Math.max(0, (height - viewHeight) / 2 + pan.y));
    return { x, y, width: viewWidth, height: viewHeight };
  }, [height, pan.x, pan.y, width, zoom]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const centerOnSelection = () => {
    if (!selectedMarker) {
      resetView();
      return;
    }
    const pixel = toPixel(selectedMarker.position);
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    setPan({
      x: pixel.x - (viewBox.x + viewWidth / 2),
      y: pixel.y - (viewBox.y + viewHeight / 2),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (zoom === 1) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pixelX = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width;
    const pixelY = viewBox.y + ((event.clientY - bounds.top) / bounds.height) * viewBox.height;
    onCursor(fromPixel(pixelX, pixelY));
    if (drag.current) {
      const scaleX = viewBox.width / bounds.width;
      const scaleY = viewBox.height / bounds.height;
      setPan({
        x: drag.current.panX + (drag.current.x - event.clientX) * scaleX,
        y: drag.current.panY + (drag.current.y - event.clientY) * scaleY,
      });
    }
  };

  const endDrag = () => {
    drag.current = null;
  };

  const raTicks = [0.25, 0.5, 0.75].map((fraction) => {
    const x = viewBox.x + fraction * viewBox.width;
    const position = fromPixel(x, viewBox.y);
    return { x, label: sys === 'eq' ? formatRa(position.ra) : formatGalactic(position).split('·')[0] };
  });

  const decTicks = [0.1, 0.5, 0.9].map((fraction) => {
    const y = viewBox.y + fraction * viewBox.height;
    const position = fromPixel(viewBox.x, y);
    return { y, label: sys === 'eq' ? formatDec(position.dec) : `b ${toGalactic(position).b.toFixed(2)}°` };
  });

  const gridLines = useMemo(() => {
    const step = Math.max(2, Math.round(width / 10));
    const vertical = [];
    const horizontal = [];
    for (let x = step; x < width; x += step) vertical.push(x);
    for (let y = step; y < height; y += step) horizontal.push(y);
    return { vertical, horizontal };
  }, [height, width]);

  const imageUrl = currentFrame ? api.frameImage(field.field_id, currentFrame.frame_ref) : null;
  const flagsUrl =
    currentFrame && showFlags ? api.flagsImage(field.field_id, currentFrame.frame_ref) : null;

  const hypothesisShapes = (hypothesis?.items ?? []).filter(
    (item) => item.shape && item.contains_field,
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0f1c]">
      {view === 'aladin' && !aladinFailed ? (
        <AladinSky
          field={field}
          candidates={candidates}
          selectedId={selectedId}
          onSelect={onSelect}
          onFailed={setAladinFailed}
        />
      ) : (
        <svg
          role="img"
          aria-label={`Sky field at ${formatRa(grid.ra)}, ${formatDec(grid.dec)}. ${
            candidates.length
          } unconfirmed candidates.`}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="h-full w-full touch-none"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={() => {
            endDrag();
            onCursor(null);
          }}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((value) => Math.min(6, Math.max(1, value * (event.deltaY < 0 ? 1.2 : 0.84))));
          }}
          onClick={(event) => {
            if (drag.current) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const pixelX = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width;
            const pixelY = viewBox.y + ((event.clientY - bounds.top) / bounds.height) * viewBox.height;
            onSkyClick(fromPixel(pixelX, pixelY));
          }}
          onKeyDown={(event) => {
            if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(6, value * 1.3));
            if (event.key === '-' || event.key === '_') setZoom((value) => Math.max(1, value / 1.3));
            if (event.key === 'Escape') onSelect(null);
          }}
        >
          <defs>
            <radialGradient id="selection-halo">
              <stop offset="0%" stopColor={CANDIDATE_COLOR} stopOpacity="0.34" />
              <stop offset="100%" stopColor={CANDIDATE_COLOR} stopOpacity="0" />
            </radialGradient>
            <marker id="trail-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill={CANDIDATE_COLOR} />
            </marker>
            <clipPath id="field-clip">
              <rect x="0" y="0" width={width} height={height} />
            </clipPath>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill="#0b1220" />
          {imageUrl && (
            <image
              href={imageUrl}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
              opacity="0.92"
            />
          )}
          {flagsUrl && (
            <image
              href={flagsUrl}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
              opacity="0.72"
            />
          )}

          <g clipPath="url(#field-clip)" aria-hidden="true">
            {gridLines.vertical.map((x) => (
              <line key={`v${x}`} x1={x} x2={x} y1="0" y2={height} className="sky-grid" strokeWidth="0.06" />
            ))}
            {gridLines.horizontal.map((y) => (
              <line key={`h${y}`} x1="0" x2={width} y1={y} y2={y} className="sky-grid" strokeWidth="0.06" />
            ))}
            <rect x="0" y="0" width={width} height={height} fill="none" stroke="#3b4a69" strokeWidth="0.12" />
          </g>

          {layers.includes('hypothesis') &&
            hypothesisShapes.map((item) => {
              const shape = item.shape;
              if (!shape) return null;
              if (shape.type === 'box') {
                const a = toPixel({ ra: shape.ra_min, dec: shape.dec_max });
                const b = toPixel({ ra: shape.ra_max, dec: shape.dec_min });
                return (
                  <rect
                    key={item.id}
                    x={Math.min(a.x, b.x)}
                    y={Math.min(a.y, b.y)}
                    width={Math.abs(a.x - b.x)}
                    height={Math.abs(a.y - b.y)}
                    fill={HYPOTHESIS_COLOR}
                    fillOpacity="0.07"
                    stroke={HYPOTHESIS_COLOR}
                    strokeDasharray="0.7 0.5"
                    strokeWidth="0.12"
                  >
                    <title>{item.name}</title>
                  </rect>
                );
              }
              const center = toPixel({ ra: shape.ra, dec: shape.dec });
              return (
                <circle
                  key={item.id}
                  cx={center.x}
                  cy={center.y}
                  r={(shape.radius_deg * 3600) / scale}
                  fill={HYPOTHESIS_COLOR}
                  fillOpacity="0.07"
                  stroke={HYPOTHESIS_COLOR}
                  strokeDasharray="0.7 0.5"
                  strokeWidth="0.12"
                >
                  <title>{item.name}</title>
                </circle>
              );
            })}

          {layers.includes('known') &&
            (known?.items ?? []).map((item) => {
              if (item.ra === null || item.dec === null) return null;
              const pixel = toPixel({ ra: item.ra, dec: item.dec });
              return (
                <g key={item.id}>
                  <rect
                    x={pixel.x - 0.7}
                    y={pixel.y - 0.7}
                    width="1.4"
                    height="1.4"
                    transform={`rotate(45 ${pixel.x} ${pixel.y})`}
                    fill="none"
                    stroke={KNOWN_COLOR}
                    strokeWidth="0.16"
                  />
                  <title>{item.name}</title>
                </g>
              );
            })}

          {layers.includes('trails') &&
            firstMjd !== null &&
            currentFrame &&
            markers.map((marker) => {
              if (marker.staticFlag) return null;
              const start = toPixel(marker.candidate.position);
              const end = toPixel(marker.position);
              if (Math.hypot(end.x - start.x, end.y - start.y) < 0.2) return null;
              return (
                <line
                  key={`trail-${marker.candidate.candidate_id}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={CANDIDATE_COLOR}
                  strokeOpacity="0.42"
                  strokeWidth="0.14"
                  markerEnd="url(#trail-arrow)"
                />
              );
            })}

          {markers.map((marker) => {
            const visible = marker.staticFlag ? layers.includes('static') : layers.includes('moving');
            if (!visible) return null;
            const pixel = toPixel(marker.position);
            const color = marker.staticFlag ? STATIC_COLOR : CANDIDATE_COLOR;
            const radius = marker.selected ? 1.9 : marker.hovered ? 1.7 : 1.45;
            return (
              <g
                key={marker.candidate.candidate_id}
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(marker.candidate.candidate_id);
                }}
                onMouseEnter={() => onHover(marker.candidate.candidate_id)}
                onMouseLeave={() => onHover(null)}
                role="button"
                aria-label={`${marker.candidate.ordinal ? `#${marker.candidate.ordinal}` : 'Candidate'}, unconfirmed`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(marker.candidate.candidate_id);
                  }
                }}
              >
                {marker.selected && (
                  <circle cx={pixel.x} cy={pixel.y} r={radius * 2.6} fill="url(#selection-halo)" />
                )}
                <circle
                  cx={pixel.x}
                  cy={pixel.y}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={marker.selected ? 0.24 : 0.17}
                  strokeDasharray={marker.staticFlag ? '0.45 0.3' : undefined}
                />
                <text
                  x={pixel.x + radius + 0.4}
                  y={pixel.y + 0.35}
                  fill={color}
                  fontSize="1.05"
                  fontFamily="'IBM Plex Mono', monospace"
                  paintOrder="stroke"
                  stroke="#0b1220"
                  strokeWidth="0.22"
                >
                  {marker.candidate.ordinal ? `#${String(marker.candidate.ordinal).padStart(3, '0')}` : '#'}
                </text>
                <title>
                  {`${marker.candidate.ordinal ? `#${marker.candidate.ordinal}` : 'Candidate'} · ${
                    marker.staticFlag ? 'static-source flag' : 'moving'
                  } · stack SNR ${marker.candidate.stack_snr.toFixed(1)} · unconfirmed`}
                </title>
              </g>
            );
          })}

          {raTicks.map((tick, index) => (
            <text
              key={`ra-${tick.x}`}
              x={tick.x}
              y={viewBox.y + 2.2}
              textAnchor={
                index === 0 ? 'start' : index === raTicks.length - 1 ? 'end' : 'middle'
              }
              fill="#9aa3b8"
              fontSize="0.95"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {tick.label}
            </text>
          ))}
          {decTicks.map((tick) => (
            <text
              key={`dec-${tick.y}`}
              x={viewBox.x + 0.4}
              y={tick.y}
              textAnchor="start"
              fill="#9aa3b8"
              fontSize="0.95"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-line-2 bg-bar/90 p-1 backdrop-blur">
          <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(6, v * 1.3))}>
            <Plus className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(1, v / 1.3))}>
            <Minus className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Recentre on selection or field" onClick={centerOnSelection}>
            <Crosshair className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <span className="rounded-full border border-line-2 bg-bar/90 px-2.5 py-1 font-mono text-[10px] text-haze backdrop-blur">
            {currentFrame ? `${formatWavelength(currentFrame.wavelength_um)} · D${currentFrame.detector}` : 'No frame'}
          </span>
          {aladinFailed && (
            <span className="max-w-[260px] rounded-lg border border-amber/40 bg-bar/90 px-2.5 py-1 text-[11px] text-amber">
              Aladin could not start; showing the offline view.
            </span>
          )}
          {!currentFrame && (
            <span className={cn('rounded-full border border-line-2 bg-bar/90 px-2.5 py-1 text-[11px] text-haze')}>
              Waiting for the first frame
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
