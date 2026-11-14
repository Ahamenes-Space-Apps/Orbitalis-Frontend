import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Frame } from '@/data/types';
import { formatMjdDate, formatMjdDay, formatWavelength } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FrameScrubberProps {
  frames: Frame[];
  selectedRef: string | null;
  order: 'time' | 'wavelength';
  playing: boolean;
  speed: number;
  onOrder: (order: 'time' | 'wavelength') => void;
  onSelect: (frameRef: string) => void;
  onPlaying: (playing: boolean) => void;
  onSpeed: (speed: number) => void;
}

export function FrameScrubber({
  frames,
  selectedRef,
  order,
  playing,
  speed,
  onOrder,
  onSelect,
  onPlaying,
  onSpeed,
}: FrameScrubberProps) {
  const ordered = [...frames].sort((a, b) =>
    order === 'time' ? a.mjd - b.mjd : a.wavelength_um - b.wavelength_um,
  );
  const index = ordered.findIndex((frame) => frame.frame_ref === selectedRef);
  const selected = index >= 0 ? ordered[index] : ordered[0] ?? null;

  useEffect(() => {
    if (!playing || ordered.length < 2) return;
    const timer = window.setInterval(() => {
      const current = ordered.findIndex((frame) => frame.frame_ref === selectedRef);
      const next = (current + 1) % ordered.length;
      onSelect(ordered[next].frame_ref);
    }, Math.max(125, 1000 / speed));
    return () => window.clearInterval(timer);
  }, [onSelect, ordered, playing, selectedRef, speed]);

  const step = (direction: -1 | 1) => {
    if (ordered.length === 0) return;
    const current = index < 0 ? 0 : index;
    const next = (current + direction + ordered.length) % ordered.length;
    onSelect(ordered[next].frame_ref);
  };

  if (frames.length === 0) {
    return (
      <div className="border-t border-line bg-bar px-4 py-3 text-[12px] text-haze" role="status">
        Waiting for frames. The scrubber fills as observations arrive.
      </div>
    );
  }

  const mjdMin = Math.min(...frames.map((frame) => frame.mjd));
  const mjdMax = Math.max(...frames.map((frame) => frame.mjd));
  const waveMin = Math.min(...frames.map((frame) => frame.wavelength_um));
  const waveMax = Math.max(...frames.map((frame) => frame.wavelength_um));

  return (
    <section className="flex flex-col gap-2 border-t border-line bg-bar px-4 py-2.5" aria-label="Frame scrubber">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous frame" onClick={() => step(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={playing ? 'Pause playback' : 'Play frames'}
            onClick={() => onPlaying(!playing)}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next frame" onClick={() => step(1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-haze">
          Order
          <select
            value={order}
            onChange={(event) => onOrder(event.target.value as 'time' | 'wavelength')}
            className="min-h-8 rounded-md border border-line-2 bg-panel px-2 text-[11px] text-mist"
            aria-label="Order frames"
          >
            <option value="time">Time</option>
            <option value="wavelength">Wavelength</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[11px] text-haze">
          Speed
          <select
            value={speed}
            onChange={(event) => onSpeed(Number(event.target.value))}
            className="min-h-8 rounded-md border border-line-2 bg-panel px-2 text-[11px] text-mist"
            aria-label="Playback speed"
          >
            {[1, 2, 4, 8].map((value) => (
              <option key={value} value={value}>
                {value} fps
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-0 flex-1" />

        {selected && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line-2 bg-panel px-3 py-1.5 font-mono text-[11px] text-mist">
            <span title={formatMjdDate(selected.mjd)}>{formatMjdDay(selected.mjd)}</span>
            <span>{formatWavelength(selected.wavelength_um)}</span>
            <span>D{selected.detector}</span>
            <span>{selected.release.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="relative h-4">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          <div className="absolute inset-0 flex items-center justify-between">
            {ordered.map((frame, tickIndex) => {
              const active = frame.frame_ref === selected?.frame_ref;
              return (
                <button
                  key={frame.frame_ref}
                  type="button"
                  onClick={() => onSelect(frame.frame_ref)}
                  aria-label={`Show frame ${tickIndex + 1} of ${ordered.length}, ${formatWavelength(
                    frame.wavelength_um,
                  )}, ${formatMjdDate(frame.mjd)}`}
                  aria-pressed={active}
                  className={cn(
                    'z-10 h-3 w-1 cursor-pointer rounded-full border transition-all',
                    active
                      ? 'h-4 w-1.5 border-amber bg-amber'
                      : 'border-line-2 bg-bar hover:border-amber/70 hover:bg-amber/40',
                  )}
                  style={{ flexGrow: 0 }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between font-mono text-[10px] text-haze">
          <span>{order === 'time' ? formatMjdDate(mjdMin) : formatWavelength(waveMin)}</span>
          <span>{ordered.length} frames</span>
          <span>{order === 'time' ? formatMjdDate(mjdMax) : formatWavelength(waveMax)}</span>
        </div>
      </div>
    </section>
  );
}
