import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BAND_COUNT, WAVELENGTH_RANGE_UM } from '@/data/types';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';
import { DURATION, EASE } from '@/lib/motion';
import { Button } from '@/components/ui/button';

const TICKS = Array.from({ length: BAND_COUNT }, (_, i) => `hsl(${(250 - i * 2.3).toFixed(0)}, 72%, 62%)`);

/**
 * The 102 SPHEREx bands as a strip. Drag across it to select a band range, or focus it and use the arrow keys
 * (Shift+arrows change the width, Escape clears). The range highlights the matching part of every dossier spectrum
 * and marks candidates whose spectral anomaly overlaps it.
 */
export function BandStrip() {
  const bandRange = useUi((s) => s.bandRange);
  const setBandRange = useUi((s) => s.setBandRange);
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const moved = useRef(false);

  const indexAt = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 1;
    const f = (clientX - rect.left) / rect.width;
    return Math.min(BAND_COUNT, Math.max(1, Math.floor(f * BAND_COUNT) + 1));
  };

  const label = bandRange
    ? `bands ${bandRange[0]}–${bandRange[1]} of ${BAND_COUNT}`
    : `all ${BAND_COUNT} · ${WAVELENGTH_RANGE_UM[0].toFixed(2)}–${WAVELENGTH_RANGE_UM[1].toFixed(1)} µm`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const [a, b] = bandRange ?? [1, 10];
    const clampRange = (x: number, y: number): [number, number] => [
      Math.max(1, Math.min(BAND_COUNT, Math.min(x, y))),
      Math.max(1, Math.min(BAND_COUNT, Math.max(x, y))),
    ];
    if (e.key === 'Escape') return setBandRange(null);
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const d = e.key === 'ArrowRight' ? 1 : -1;
    if (e.shiftKey) setBandRange(clampRange(a, b + d));
    else {
      const width = b - a;
      const na = Math.max(1, Math.min(BAND_COUNT - width, a + d));
      setBandRange([na, na + width]);
    }
  };

  return (
    <div className="flex min-w-60 flex-1 basis-70 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] tracking-widest text-haze">BAND FILTER</div>
        <div className="font-mono text-xs text-ink" data-testid="band-label">
          {label}
        </div>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label="Band range. Drag to select, or use the arrow keys."
        className={cn(
          'flex h-[26px] cursor-ew-resize touch-none gap-px rounded-sm transition-shadow duration-300',
          bandRange && 'ring-1 ring-violet/50 ring-offset-2 ring-offset-bar',
        )}
        onPointerDown={(e) => {
          anchor.current = indexAt(e.clientX);
          moved.current = false;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (anchor.current === null) return;
          const i = indexAt(e.clientX);
          if (i !== anchor.current) moved.current = true;
          if (moved.current) setBandRange([Math.min(anchor.current, i), Math.max(anchor.current, i)]);
        }}
        onPointerUp={() => {
          if (!moved.current) setBandRange(null);
          anchor.current = null;
        }}
        onKeyDown={onKeyDown}
      >
        {TICKS.map((bg, i) => {
          const inRange = !bandRange || (i + 1 >= bandRange[0] && i + 1 <= bandRange[1]);
          return (
            <div
              key={i}
              aria-hidden="true"
              className="min-w-0 flex-1 rounded-[1px] transition-[opacity,transform] duration-300 hover:scale-y-125"
              style={{ background: bg, opacity: inRange ? 1 : 0.22 }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-haze">
        <span>Drag across the strip to isolate a band range.</span>
        <AnimatePresence initial={false}>
          {bandRange && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: DURATION.fast, ease: EASE }}
            >
              <Button variant="ghost" size="sm" className="min-h-8 px-2" onClick={() => setBandRange(null)}>
                All bands
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
