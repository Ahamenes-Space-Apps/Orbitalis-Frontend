import { useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { FieldInfo } from '@/data/types';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';
import { DURATION, EASE, springSoft } from '@/lib/motion';

const EPOCH_MS = 1800;

export function TimelinePanel({ field }: { field: FieldInfo }) {
  const epoch = useUi((s) => s.epoch);
  const setEpoch = useUi((s) => s.setEpoch);
  const stepEpoch = useUi((s) => s.stepEpoch);
  const playing = useUi((s) => s.playing);
  const togglePlay = useUi((s) => s.togglePlay);
  const setPlaying = useUi((s) => s.setPlaying);
  const current = field.epochs.find((e) => e.id === epoch) ?? field.epochs[0];
  const frac = (epoch - 1) / (field.epochs.length - 1);

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
      aria-label="Time and band controls"
      className="absolute inset-x-5 bottom-5 flex flex-wrap items-center gap-x-9 gap-y-5 rounded-2xl border border-line-2 bg-bar/90 px-[22px] py-4 backdrop-blur-md"
    >
      <div className="relative shrink-0">
        <motion.button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause epochs' : 'Play epochs'}
          aria-pressed={playing}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            'relative flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors',
            playing
              ? 'border-accent bg-accent text-field'
              : 'border-accent bg-accent/12 text-accent',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={playing ? 'pause' : 'play'}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: DURATION.fast, ease: EASE }}
              className="flex"
            >
              {playing ? (
                <Pause className="size-[18px] fill-current" aria-hidden="true" />
              ) : (
                <Play className="size-[18px] fill-current" aria-hidden="true" />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {playing && (
            <svg
              className="pointer-events-none absolute inset-0 size-12 -rotate-90 text-accent"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <motion.circle
                key={epoch}
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: EPOCH_MS / 1000, ease: 'linear' }}
              />
            </svg>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-w-65 flex-1 basis-90 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] tracking-widest text-haze">SKY EPOCH</div>
          <div
            className="font-mono text-xs text-ink"
            data-testid="epoch-label"
            aria-live="polite"
            aria-atomic="true"
          >
            {`Epoch ${current.id} of ${field.epochs.length} · ${current.offsetLabel}`}
          </div>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="absolute top-3.5 right-9 left-9 h-0.5 bg-line-2" />
          <motion.div
            aria-hidden="true"
            className="absolute top-3.5 left-9 h-0.5 origin-left bg-accent"
            style={{ width: 'calc(100% - 72px)' }}
            initial={false}
            animate={{ scaleX: frac }}
            transition={{ duration: DURATION.epoch, ease: EASE }}
          />
          <div className="relative flex justify-between" role="group" aria-label="Sky epoch">
            {field.epochs.map((e) => {
              const active = e.id === epoch;
              const done = e.id < epoch;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEpoch(e.id)}
                  aria-pressed={active}
                  aria-label={`Show ${e.label}`}
                  className="flex w-[72px] cursor-pointer flex-col items-center gap-1.5 bg-transparent py-1"
                >
                  <motion.span
                    className={cn(
                      'size-[22px] rounded-full border-2',
                      active
                        ? 'border-accent bg-accent'
                        : done
                          ? 'border-accent bg-accent/35'
                          : 'border-line-2 bg-bar',
                    )}
                    initial={false}
                    animate={{ scale: active ? 1.12 : 1 }}
                    transition={springSoft}
                  />
                  <span
                    className={cn(
                      'text-[13px] font-semibold',
                      active ? 'text-ink' : 'text-haze',
                    )}
                  >
                    {e.label}
                  </span>
                  <span className="font-mono text-[11px] text-haze">{e.offsetLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>


    </section>
  );
}
