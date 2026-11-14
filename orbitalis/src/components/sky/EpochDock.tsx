import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw } from 'lucide-react';
import type { EpochId, FieldInfo } from '@/data/types';
import { EPOCH_IDS, epochForField } from '@/lib/epochs';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';

const EPOCH_MS = 1600;
const MODES = [
  { key: 'epoch', label: 'Epoch' },
  { key: 'trails', label: 'Trails' },
  { key: 'tempdiff', label: 'Temp Diff' },
] as const;

export function EpochDock({
  field,
  onResetView,
}: {
  field: FieldInfo;
  onResetView: () => void;
}) {
  const [open, setOpen] = useState(true);
  const epoch = useUi((s) => s.epoch);
  const setEpoch = useUi((s) => s.setEpoch);
  const stepEpoch = useUi((s) => s.stepEpoch);
  const playing = useUi((s) => s.playing);
  const togglePlay = useUi((s) => s.togglePlay);
  const setPlaying = useUi((s) => s.setPlaying);
  const tempMode = useUi((s) => s.tempMode);
  const setTempMode = useUi((s) => s.setTempMode);
  const current = epochForField(field, epoch);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(stepEpoch, EPOCH_MS);
    return () => window.clearTimeout(id);
  }, [playing, epoch, stepEpoch]);

  useEffect(() => {
    if (!playing) return;
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playing, setPlaying]);

  return (
    <section
      aria-label="Epoch time controls"
      className="pointer-events-auto w-[min(720px,calc(100vw-2rem))] border border-[#1e466b]/80 bg-[#0d0d0d]/95 text-[#fafafa]"
    >
      <div className="flex h-9 items-center gap-2 px-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause epochs' : 'Play epochs'}
          aria-pressed={playing}
          className={cn(
            'grid size-7 shrink-0 cursor-pointer place-items-center border transition-colors',
            playing ? 'border-[#67baf4] bg-[#67baf4] text-[#0d0d0d]' : 'border-[#1e466b] text-[#67baf4] hover:border-[#67baf4]',
          )}
        >
          {playing ? <Pause className="size-3.5 fill-current" aria-hidden="true" /> : <Play className="size-3.5 fill-current" aria-hidden="true" />}
        </button>

        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#94a3b8]">
          EPOCH {epoch} / {field.epochs.length}
        </span>

        <div className="min-w-0 flex-1 px-1">
          <input
            type="range"
            min={1}
            max={field.epochs.length}
            step={1}
            value={epoch}
            aria-label="Epoch slider"
            onChange={(e) => setEpoch(Number(e.target.value) as EpochId)}
            className="h-1 w-full cursor-pointer accent-[#67baf4]"
          />
        </div>

        <div className="hidden shrink-0 items-center gap-px md:flex" role="group" aria-label="Epoch ticks">
          {EPOCH_IDS.slice(0, field.epochs.length).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setEpoch(id)}
              aria-label={`Show Epoch ${id}`}
              aria-pressed={id === epoch}
              className={cn(
                'min-w-7 cursor-pointer border px-1.5 py-0.5 font-mono text-[9px] tabular-nums transition-colors',
                id === epoch
                  ? 'border-[#67baf4] bg-[#67baf4] text-[#0d0d0d]'
                  : 'border-[#1e466b]/70 text-[#94a3b8] hover:border-[#67baf4] hover:text-[#fafafa]',
              )}
            >
              E{id}
            </button>
          ))}
        </div>

        <div className="hidden shrink-0 border border-[#1e466b]/70 sm:flex" role="group" aria-label="Temporal mode">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setTempMode(m.key)}
              aria-pressed={tempMode === m.key}
              className={cn(
                'cursor-pointer whitespace-nowrap px-2 py-0.5 text-[9px] font-medium transition-colors',
                tempMode === m.key ? 'bg-[#1e466b] text-[#fafafa]' : 'text-[#94a3b8] hover:text-[#fafafa]',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetView}
          aria-label="Reset camera to all-sky"
          className="grid size-7 shrink-0 cursor-pointer place-items-center border border-[#1e466b] text-[#94a3b8] transition-colors hover:border-[#67baf4] hover:text-[#fafafa]"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse epoch dock' : 'Expand epoch dock'}
          aria-expanded={open}
          className="grid size-7 shrink-0 cursor-pointer place-items-center text-[#94a3b8] transition-colors hover:text-[#fafafa]"
        >
          {open ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronUp className="size-3.5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e466b]/60 px-3 py-1.5 font-mono text-[9px] tabular-nums text-[#94a3b8]">
          <span>{current?.offsetLabel ?? 'T + 0'}</span>
          <span className="sm:hidden">
            <span className="flex gap-px">
              {EPOCH_IDS.slice(0, field.epochs.length).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEpoch(id)}
                  aria-pressed={id === epoch}
                  className={cn(
                    'min-w-6 cursor-pointer border px-1 py-0.5 text-[9px]',
                    id === epoch ? 'border-[#67baf4] text-[#67baf4]' : 'border-[#1e466b]/60',
                  )}
                >
                  E{id}
                </button>
              ))}
            </span>
          </span>
          <span className="hidden sm:inline">Temporal Difference Engine · {tempMode === 'tempdiff' ? 'E1 baseline active' : tempMode}</span>
        </div>
      )}
    </section>
  );
}
