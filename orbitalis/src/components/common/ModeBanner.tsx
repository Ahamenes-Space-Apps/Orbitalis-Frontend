import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { usingMockApi } from '@/data/api';
import { useHealth } from '@/data/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Mode banner (UX §8.2). Mock mode always says so; live mode follows health.
 * Dismissal lasts for this state only, so a changed state brings it back.
 */
export function ModeBanner({ className }: { className?: string }) {
  const health = useHealth();
  const status = health.data?.data.status;
  const [dismissed, setDismissed] = useState<string | null>(null);

  const message = usingMockApi
    ? 'Mock API · Demo data. Loaded instantly from the checked-in bundle; nothing is live.'
    : status === 'offline'
      ? 'Archive unavailable. Showing demo data.'
      : status === 'degraded'
        ? 'Some observations could not be downloaded. Results use the rest.'
        : null;

  useEffect(() => {
    setDismissed(null);
  }, [message]);

  if (!message || dismissed === message) return null;

  const tone = usingMockApi || status === 'offline' ? 'mock' : 'degraded';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 border-b px-4 py-2 text-[12px] leading-snug',
        tone === 'mock'
          ? 'border-line bg-[#10182a] text-mist'
          : 'border-amber/40 bg-amber/10 text-amber-soft',
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <p className="m-0 flex-1">{message}</p>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 min-h-0"
        aria-label="Dismiss mode banner for this session"
        onClick={() => setDismissed(message)}
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
