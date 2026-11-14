import { useMemo, useRef, type KeyboardEvent } from 'react';
import type { Frame, Spectrum } from '@/data/types';
import { formatWavelength, formatWavelengthRange } from '@/lib/format';
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
 * Thin spectrum-style strip over the real stored wavelengths. Each tick is one
 * distinct `wavelength_um` value (rounded like the coverage chart); the hue is a
 * positional rainbow for readability only — it is not a calibrated colour.
 * Drag or use the arrow keys to select a real wavelength interval.
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
  const interactive = Boolean(onSelectionChange) && slots.length > 1;

  if (slots.length === 0) {
    return (
      <p className={className ?? 'm-0 text-[11px] text-haze'}>
        Wavelength coverage appears once frames are stored.
      </p>
    );
  }

  const wavelengths = slots.map((slot) => slot.wavelength);
  const min = wavelengths[0];
  const max = wavelengths[wavelengths.length - 1];
  const span = Math.max(max - min, 1e-6);
  const slotCount = wavelengths.length;

  const framesInRange = activeRange
    ? frames.filter((frame) => inWavelengthRange(frame.wavelength_um, activeRange)).length
    : frames.length;

  const selectedIndices = activeRange
    ? wavelengths
        .map((wavelength, index) => (inWavelengthRange(wavelength, activeRange) ? index : -1))
        .filter((index) => index >= 0)
    : [];
  const firstSelected = selectedIndices.length ? selectedIndices[0] : null;
  const lastSelected = selectedIndices.length ? selectedIndices[selectedIndices.length - 1] : null;

  const indexAt = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || slotCount === 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(slotCount - 1, Math.floor(ratio * slotCount));
  };

  const rangeForIndices = (a: number, b: number): WavelengthRange => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    return [wavelengthKey(wavelengths[low]), wavelengthKey(wavelengths[high])];
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelectionChange) return;
    if (event.key === 'Escape') {
      onSelectionChange(null);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const width =
      firstSelected !== null && lastSelected !== null ? lastSelected - firstSelected : 0;
    const latestStart = slotCount - 1 - width;

    if (firstSelected === null) {
      const index = direction === 1 ? 0 : slotCount - 1;
      onSelectionChange(rangeForIndices(index, index));
      return;
    }

    if (event.shiftKey) {
      if (direction === 1) {
        const nextEdge = Math.min(slotCount - 1, (lastSelected ?? firstSelected) + 1);
        onSelectionChange(rangeForIndices(firstSelected, nextEdge));
      } else {
        const nextEdge = Math.max(0, firstSelected - 1);
        onSelectionChange(rangeForIndices(nextEdge, lastSelected ?? firstSelected));
      }
      return;
    }

    const start = firstSelected;
    const nextStart = Math.min(latestStart, Math.max(0, start + direction));
    onSelectionChange(rangeForIndices(nextStart, nextStart + width));
  };

  const label = activeRange
    ? `${formatWavelengthRange(activeRange)} · ${firstSelected !== null ? selectedIndices.length : 0} of ${slotCount} wavelengths · ${framesInRange} of ${frames.length} frames`
    : `all ${slotCount} wavelengths · ${formatWavelengthRange([min, max])} · ${frames.length} frame${frames.length === 1 ? '' : 's'}`;

  return (
    <div className={cn('flex min-w-0 flex-1 basis-70 flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-[11px] tracking-widest text-haze">WAVELENGTH FILTER</div>
        <div className="font-mono text-xs text-ink" data-testid="wavelength-strip-label">
          {label}
        </div>
      </div>

      <div
        ref={ref}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'group' : undefined}
        aria-label={
          interactive
            ? 'Wavelength range selector over stored wavelengths. Drag to select, or use the arrow keys; Escape clears.'
            : undefined
        }
        className={cn(
          'flex h-[26px] gap-px rounded-sm transition-shadow duration-300',
          interactive && 'cursor-ew-resize touch-none',
          interactive &&
            'outline-none focus-visible:ring-1 focus-visible:ring-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bar',
          activeRange && 'ring-1 ring-violet/50 ring-offset-2 ring-offset-bar',
        )}
        onPointerDown={(event) => {
          if (!interactive || event.button !== 0) return;
          anchor.current = indexAt(event.clientX);
          moved.current = false;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!interactive || anchor.current === null) return;
          const index = indexAt(event.clientX);
          if (index !== anchor.current) moved.current = true;
          if (moved.current) onSelectionChange?.(rangeForIndices(anchor.current, index));
        }}
        onPointerUp={() => {
          if (!interactive) return;
          if (!moved.current) onSelectionChange?.(null);
          anchor.current = null;
        }}
        onPointerCancel={() => {
          anchor.current = null;
          moved.current = false;
        }}
        onKeyDown={onKeyDown}
        data-testid="wavelength-strip"
      >
        {slots.map((slot, index) => {
          const t = (slot.wavelength - min) / span;
          const hue = (250 - t * 230).toFixed(1);
          const inRange =
            !activeRange || inWavelengthRange(slot.wavelength, activeRange);
          const isSelectedEdge =
            index === firstSelected || index === lastSelected;
          return (
            <div
              key={slot.wavelength}
              aria-hidden="true"
              title={`${formatWavelength(slot.wavelength)} · ${slot.frames} frame${
                slot.frames === 1 ? '' : 's'
              }${slot.detectors.length ? ` · detector ${slot.detectors.map((id) => `D${id}`).join(', ')}` : ''}`}
              className={cn(
                'min-w-0 flex-1 rounded-[1px] transition-[opacity,transform] duration-300',
                interactive && 'hover:scale-y-125',
                isSelectedEdge && 'scale-y-125',
              )}
              style={{
                background: `hsl(${hue}, 72%, 62%)`,
                opacity: inRange ? 1 : 0.22,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-haze">
        <span>Drag across the strip to isolate a wavelength range.</span>
        {activeRange && onSelectionChange && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-8 px-2"
            onClick={() => onSelectionChange(null)}
          >
            All wavelengths
          </Button>
        )}
      </div>
    </div>
  );
}
