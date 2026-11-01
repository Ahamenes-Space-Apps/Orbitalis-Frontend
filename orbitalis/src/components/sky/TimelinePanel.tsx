import { Play } from 'lucide-react';
import type { FieldInfo } from '@/data/types';
import { useUi } from '@/store/useUi';
import { cn } from '@/lib/utils';
import { BandStrip } from './BandStrip';

export function TimelinePanel({ field }: { field: FieldInfo }) {
  const epoch = useUi((s) => s.epoch);
  const setEpoch = useUi((s) => s.setEpoch);
  const stepEpoch = useUi((s) => s.stepEpoch);
  const current = field.epochs.find((e) => e.id === epoch) ?? field.epochs[0];
  const frac = (epoch - 1) / (field.epochs.length - 1);

  return (
    <section
      aria-label="Time and band controls"
      className="absolute inset-x-5 bottom-5 flex flex-wrap items-center gap-x-9 gap-y-5 rounded-2xl border border-line-2 bg-bar/90 px-[22px] py-4 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={stepEpoch}
        aria-label="Step to next epoch"
        className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-amber bg-amber/12 text-amber"
      >
        <Play className="size-[18px] fill-current" aria-hidden="true" />
      </button>

      <div className="flex min-w-65 flex-1 basis-90 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] tracking-widest text-haze">SKY EPOCH</div>
          <div className="font-mono text-xs text-ink" data-testid="epoch-label">
            {`Epoch ${current.id} of ${field.epochs.length} · ${current.offsetLabel}`}
          </div>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="absolute top-3.5 right-9 left-9 h-0.5 bg-line-2" />
          <div
            aria-hidden="true"
            className="absolute top-3.5 left-9 h-0.5 bg-amber"
            style={{ width: `calc((100% - 72px) * ${frac})` }}
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
                  <span
                    className={cn(
                      'size-[22px] rounded-full border-2',
                      active ? 'border-amber bg-amber' : done ? 'border-amber bg-amber/35' : 'border-[#3a4666] bg-bar',
                    )}
                  />
                  <span className={cn('text-[13px] font-semibold', active ? 'text-ink' : 'text-haze')}>{e.label}</span>
                  <span className="font-mono text-[11px] text-haze">{e.offsetLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BandStrip />
    </section>
  );
}
