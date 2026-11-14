import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { offsetToSky, skyToOffset } from '@/lib/coords';
import { sky } from '@/lib/palette';
import { KIND_COLOR, type SkyItem } from '@/lib/skyItems';
import { DURATION, EASE, springSoft } from '@/lib/motion';
import type { SkyRendererProps } from './types';

const SCALE_BAR_CHOICES = [30, 60, 120, 300, 600];

function hashOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

function formatScale(arcsec: number): string {
  return arcsec >= 60 ? `${arcsec / 60}′` : `${arcsec}″`;
}

function shortRa(raDeg: number): string {
  const hours = (((raDeg % 360) + 360) % 360) / 15;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 60 ? `${(h + 1) % 24}h 00m` : `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Built-in sky view: plain SVG on a tangent-plane projection with pan and zoom.
 * It needs no network, so it is the fallback when Aladin Lite cannot load, and it is what the tests render.
 */
export function SvgSky({ field, items, onSelect, ref }: SkyRendererProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom needs a non-passive listener so the page does not scroll underneath.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(40, Math.max(0.5, z * Math.exp(-e.deltaY * 0.0015))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const baseScale = Math.min(size.w, size.h) / (field.fovArcmin * 60 * 1.12);
  const scale = baseScale * zoom;

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => setZoom((z) => Math.min(40, z * 1.4)),
      zoomOut: () => setZoom((z) => Math.max(0.5, z / 1.4)),
      centerOn: (pos) => {
        if (!pos) return setView({ x: 0, y: 0 });
        const o = skyToOffset(field.center, pos);
        setView({ x: o.dx, y: o.dy });
      },
    }),
    [field.center],
  );

  const project = (ra: number, dec: number) => {
    const o = skyToOffset(field.center, { ra, dec });
    // East is left, north is up.
    return { x: size.w / 2 - (o.dx - view.x) * scale, y: size.h / 2 - (o.dy - view.y) * scale };
  };

  const projected = useMemo(
    () => items.map((it) => ({ it, ...project(it.ra, it.dec) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, size, scale, view, field.center],
  );

  const gridLines = useMemo(() => {
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number; label?: string; lx?: number; ly?: number }[] = [];
    for (let k = -4; k <= 4; k++) {
      const arc = k * 150;
      const vx = size.w / 2 - (arc - view.x) * scale;
      const hy = size.h / 2 - (arc - view.y) * scale;
      const ra = offsetToSky(field.center, arc, 0).ra;
      lines.push({ key: `v${k}`, x1: vx, y1: 0, x2: vx, y2: size.h, label: shortRa(ra), lx: vx + 6, ly: 16 });
      lines.push({
        key: `h${k}`,
        x1: 0,
        y1: hy,
        x2: size.w,
        y2: hy,
        label: `${(field.center.dec + arc / 3600).toFixed(2)}°`,
        lx: 8,
        ly: hy - 6,
      });
    }
    return lines;
  }, [size, scale, view, field.center]);

  const barArcsec = SCALE_BAR_CHOICES.find((a) => a * scale >= 70) ?? SCALE_BAR_CHOICES[SCALE_BAR_CHOICES.length - 1];

  const ordered = useMemo(() => {
    const rank = (i: SkyItem) => (i.kind === 'star' ? 0 : i.kind === 'ghost' ? 1 : i.selected ? 3 : 2);
    return [...projected].sort((a, b) => rank(a.it) - rank(b.it));
  }, [projected]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 touch-none overflow-hidden"
      style={{ background: sky.backdrop, cursor: drag.current ? 'grabbing' : 'grab' }}
      data-testid="sky-svg"
    >
      <svg
        width={size.w}
        height={size.h}
        role="group"
        aria-label={`Sky map of ${field.name}. Candidates are buttons.`}
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[data-cid]')) return;
          drag.current = { x: e.clientX, y: e.clientY };
          (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setView((v) => ({ x: v.x + dx / scale, y: v.y + dy / scale }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <g aria-hidden="true">
          {gridLines.map((l) => (
            <g key={l.key}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={sky.grid} />
              {l.label && (
                <text x={l.lx} y={l.ly} fill={sky.gridLabel} fontSize="11" fontFamily="var(--font-mono)">
                  {l.label}
                </text>
              )}
            </g>
          ))}
        </g>

        <AnimatePresence initial={false}>
          {ordered.map(({ it, x, y }) => {
            if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
            if (it.kind === 'star') {
              const h = hashOf(it.key);
              const r = 1 + (h % 4) * 0.45;
              return (
                <circle
                  key={it.key}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={KIND_COLOR.star}
                  opacity={0.4 + ((h >> 3) % 5) * 0.12}
                  aria-hidden="true"
                />
              );
            }
            if (it.kind === 'ghost') {
              return (
                <motion.circle
                  key={it.key}
                  r={3.5}
                  fill={KIND_COLOR.ghost}
                  initial={{ opacity: 0, cx: x, cy: y }}
                  animate={{ opacity: it.alpha ?? 0.4, cx: x, cy: y }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE }}
                  aria-hidden="true"
                />
              );
            }
            const color = KIND_COLOR[it.kind];
            const r = it.selected ? 17 : 12;
            const label = it.label ?? '';
            return (
              <motion.g
                key={it.key}
                data-cid={it.cid}
                role="button"
                tabIndex={0}
                aria-label={`Candidate ${label}, ${it.kind}${it.selected ? ', selected' : ''}`}
                aria-pressed={it.selected ? true : false}
                initial={false}
                animate={{ x, y }}
                transition={springSoft}
                style={{ cursor: 'pointer' }}
                onClick={() => it.cid !== undefined && onSelect(it.cid)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && it.cid !== undefined) {
                    e.preventDefault();
                    onSelect(it.cid);
                  }
                }}
              >
                <circle r={22} fill="transparent" />
                {it.selected && !reduce && (
                  <motion.circle
                    r={r + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    initial={{ opacity: 0.25 }}
                    animate={{ r: [r + 5, r + 11, r + 5], opacity: [0.28, 0.04, 0.28] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {it.selected && <circle r={r + 7} fill={color} opacity={0.14} />}
                <circle
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={it.selected ? 2 : 1.5}
                  strokeDasharray={it.kind === 'variable' ? '4 3' : undefined}
                  style={it.selected ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
                />
                <text
                  x={r + 6}
                  y={4}
                  fill={color}
                  fontSize="12"
                  fontFamily="var(--font-mono)"
                >
                  {label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        <g aria-hidden="true" transform={`translate(20, ${size.h - 172})`}>
          <path d={`M0 0 v6 h${barArcsec * scale} v-6`} fill="none" stroke={sky.scaleBar} strokeWidth="1.5" />
          <text x="0" y="22" fill={sky.scaleBar} fontSize="11" fontFamily="var(--font-mono)">
            {formatScale(barArcsec)} · ≈ {Math.round(barArcsec / field.pixelScaleArcsec)} SPHEREx pixels
          </text>
        </g>
      </svg>
    </div>
  );
}
