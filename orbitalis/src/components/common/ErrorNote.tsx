import { AlertTriangle, RefreshCw } from 'lucide-react';
import { errorCopy } from '@/data/errors';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Error copy from UX §8.3, never a raw backend message. */
export function ErrorNote({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const copy = errorCopy(error);
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-[#ff6b6b]/40 bg-[#2a1218]/60 p-4 text-sm',
        compact && 'p-3',
        className,
      )}
    >
      <p className="m-0 flex items-start gap-2 font-medium text-[#ffb3b3]">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {copy.title}
      </p>
      <p className="m-0 text-[13px] text-mist">{copy.body}</p>
      <p className="m-0 font-mono text-[11px] text-haze">{copy.code}</p>
      {copy.recovery && <p className="m-0 text-[13px] text-haze">{copy.recovery}</p>}
      {onRetry && (
        <div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
