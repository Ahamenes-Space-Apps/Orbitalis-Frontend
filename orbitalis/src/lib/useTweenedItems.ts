import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { SkyItem } from '@/lib/skyItems';
import { DURATION } from '@/lib/motion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Smooths sky-item positions between updates. Canvas renderers such as Aladin cannot use
 * Motion's DOM animation, so we interpolate the catalog coordinates ourselves at ~30fps.
 * Stationary stars are passed through untouched.
 */
export function useTweenedItems(items: SkyItem[], duration = DURATION.epoch): SkyItem[] {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(items);
  const current = useRef(new Map<string, { ra: number; dec: number }>());
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const target = new Map(items.map((it) => [it.key, { ra: it.ra, dec: it.dec }]));
    if (reduce) {
      current.current = target;
      setDisplay(items);
      return;
    }

    const from = new Map(current.current);
    const started = performance.now();
    let lastPaint = 0;
    const total = duration * 1000;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / total);
      const e = easeOutCubic(t);
      const next = items.map((it) => {
        if (it.kind === 'star') return it;
        const a = from.get(it.key) ?? target.get(it.key) ?? { ra: it.ra, dec: it.dec };
        const b = target.get(it.key) ?? a;
        return {
          ...it,
          ra: a.ra + (b.ra - a.ra) * e,
          dec: a.dec + (b.dec - a.dec) * e,
        };
      });

      current.current = new Map(next.map((it) => [it.key, { ra: it.ra, dec: it.dec }]));

      if (t >= 1 || now - lastPaint >= 1000 / 30) {
        lastPaint = now;
        setDisplay(next);
      }

      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [items, duration, reduce]);

  return display;
}
