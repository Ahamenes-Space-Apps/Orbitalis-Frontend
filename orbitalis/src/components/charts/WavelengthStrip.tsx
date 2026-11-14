import { useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Frame, Spectrum } from '@/data/types';
import { formatWavelength, formatWavelengthRange } from '@/lib/format';
import { DURATION, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  inWavelengthRange,
  normalizeWavelengthRange,
  wavelengthKey,
  type WavelengthRange,
} from '@/lib/wavelength';

interface WavelengthStripProps {
  frames: Array<Pick<Frame, 'wavelength_um' | 'detector'>>;
  spectrum?: Spectrum | null;
  selection?: WavelengthRange | null;
  onSelectionChange?: (range: WavelengthRange | null) => void;
  className?: string;
}

interface WavelengthSlot {
  wavelength: number;
  frames: number;
  detectors: number[];
}

/**
 * The real stored wavelengths as a thin spectrum-style strip, laid out like the
 * old band filter. Each tick is one distinct `wavelength_um` value; the hue is a
 * positional rainbow for readability only — it is not a calibrated colour and
 * carries no band index. Drag across it to select a wavelength range, or focus
 * it and use the arrow keys (Shift+arrows change the width, Escape clears).
 */
export function WavelengthStrip({
  frames,
  spectrum,
  selection = null,
  onSelectionChange,
  className,
}: WavelengthStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const moved = useRef(false);

  const spectrumWavelengths = useMemo(
    () =>
      (spectrum?.points ?? [])
        .map((point) => point.wavelength_um)
        .filter((value) => Number.isFinite(value))
        .map(wavelengthKey),
    [spectrum],
  );

  const slots = useMemo(() => {
    const grouped = new Map<number, WavelengthSlot>();
    const ensure = (wavelength: number) => {
      let slot = grouped.get(wavelength);
      if (!slot) {
        slot = { wavelength, frames: 0, detectors: [] };
        grouped.set(wavelength, slot);
      }
      return slot;
    };
    for (const frame of frames) {
      if (!Number.isFinite(frame.wavelength_um)) continue;
      const slot = ensure(wavelengthKey(frame.wavelength_um));
      slot.frames += 1;
      if (!slot.detectors.includes(frame.detector)) slot.detectors.push(frame.detector);
    }
    for (const wavelength of spectrumWavelengths) ensure(wavelength);
    return [...grouped.values()].sort((a, b) => a.wavelength - b.wavelength);
  }, [frames, spectrumWavelengths]);

  const activeRange = normalizeWavelengthRange(selection);
  const count = slots.length;

  const indexAt = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || count === 0) return 0;
    const f = (clientX - rect.left) / rect.width;
    return Math.min(count - 1, Math.max(0, Math.floor(f * count)));
  };

  const rangeForIndices = (a: number, b: number): WavelengthRange => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    return [wavelengthKey(slots[low].wavelength), wavelengthKey(slots[high].wavelength)];
  };

  const selectedIndices = activeRange
    ? slots
        .map((slot, index) => (inWavelengthRange(slot.wavelength, activeRange) ? index : -1))
        .filter((index) => index >= 0)
    : [];
  const firstSelected = selectedIndices.length ? selectedIndices[0] : null;
  const lastSelected = selectedIndices.length ? selectedIndices[selectedIndices.length - 1] : null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!onSelectionChange || count < 2) return;
    if (e.key === 'Escape') return onSelectionChange(null);
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const d = e.key === 'ArrowRight' ? 1 : -1;

    if (firstSelected === null) {
      const index = d === 1 ? 0 : count - 1;
      onSelectionChange(rangeForIndices(index, index));
      return;
    }

    if (e.shiftKey) {
      if (d === 1) {
        const nextEdge = Math.min(count - 1, (lastSelected ?? firstSelected) + 1);
        onSelectionChange(rangeForIndices(firstSelected, nextEdge));
      } else {
        const nextEdge = Math.max(0, firstSelected - 1);
        onSelectionChange(rangeForIndices(nextEdge, lastSelected ?? firstSelected));
      }
      return;
    }

    const width = lastSelected !== null ? lastSelected - firstSelected : 0;
    const latestStart = count - 1 - width;
    const nextStart = Math.min(latestStart, Math.max(0, firstSelected + d));
    onSelectionChange(rangeForIndices(nextStart, nextStart + width));
  };

  if (count === 0) {
    return (
      <p className={className ?? 'm-0 text-[11px] text-haze'}>
        Wavelength coverage appears once frames are stored.
      </p>
    );
  }

  const min = slots[0].wavelength;
  const max = slots[count - 1].wavelength;
  const framesInRange = activeRange
    ? frames.filter((frame) => inWavelengthRange(frame.wavelength_um, activeRange)).length
    : frames.length;

  const label = activeRange
    ? `${formatWavelengthRange(activeRange)} · ${selectedIndices.length} of ${count} wavelengths · ${framesInRange} of ${frames.length} frames`
    : `all ${count} wavelengths · ${formatWavelengthRange([min, max])} · ${frames.length} frame${frames.length === 1 ? '' : 's'}`;

  return (
    <div className={cn('flex min-w-60 flex-1 basis-70 flex-col gap-2.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] tracking-widest text-haze">WAVELENGTH FILTER</div>
        <div className="font-mono text-xs text-ink" data-testid="wavelength-strip-label">
          {label}
        </div>
      </div>
      <div
        ref={ref}
        tabIndex={onSelectionChange && count > 1 ? 0 : undefined}
        role={onSelectionChange && count > 1 ? 'group' : undefined}
        aria-label="Wavelength range over stored wavelengths. Drag to select, or use the arrow keys."
        className={cn(
          'flex h-[26px] cursor-ew-resize touch-none gap-px rounded-sm transition-shadow duration-300',
          activeRange && 'ring-1 ring-violet/50 ring-offset-2 ring-offset-bar',
          !(onSelectionChange && count > 1) && 'cursor-default',
        )}
        onPointerDown={(e) => {
          if (!onSelectionChange || count < 2 || e.button !== 0) return;
          anchor.current = indexAt(e.clientX);
          moved.current = false;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!onSelectionChange || count < 2 || anchor.current === null) return;
          const i = indexAt(e.clientX);
          if (i !== anchor.current) moved.current = true;
          if (moved.current) onSelectionChange(rangeForIndices(anchor.current, i));
        }}
        onPointerUp={() => {
          if (!onSelectionChange || count < 2) return;
          if (!moved.current) onSelectionChange(null);
          anchor.current = null;
        }}
        onPointerCancel={() => {
          anchor.current = null;
          moved.current = false;
        }}
        onKeyDown={onKeyDown}
        data-testid="wavelength-strip"
      >
        {slots.map((slot, i) => {
          const inRange = !activeRange || inWavelengthRange(slot.wavelength, activeRange);
          return (
            <div
              key={slot.wavelength}
              aria-hidden="true"
              title={`${formatWavelength(slot.wavelength)} · ${slot.frames} frame${slot.frames === 1 ? '' : 's'}${slot.detectors.length ? ` · detector ${slot.detectors.map((id) => `D${id}`).join(', ')}` : ''}`}
              className="min-w-0 flex-1 rounded-[1px] transition-[opacity,transform] duration-300 hover:scale-y-125"
              style={{
                background: `hsl(${(250 - i * 2.3).toFixed(0)}, 72%, 62%)`,
                opacity: inRange ? 1 : 0.22,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-haze">
        <span>Drag across the strip to isolate a wavelength range.</span>
        <AnimatePresence initial={false}>
          {activeRange && onSelectionChange && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: DURATION.fast, ease: EASE }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="min-h-8 px-2"
                onClick={() => onSelectionChange(null)}
              >
                All wavelengths
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
