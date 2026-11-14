import { Check, Clock3, LoaderCircle, Minus, X } from 'lucide-react';
import type { FieldStatus, JobStatus } from '@/data/types';
import { cn } from '@/lib/utils';

const COPY: Record<FieldStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const TONE: Record<FieldStatus, string> = {
  queued: 'border-line-2 text-mist',
  running: 'border-amber/60 text-amber',
  completed: 'border-teal/60 text-teal',
  failed: 'border-[#ff6b6b]/60 text-[#ff8c8c]',
  cancelled: 'border-line-2 text-haze',
};

function Icon({ status }: { status: FieldStatus }) {
  const className = 'size-3.5';
  if (status === 'queued') return <Clock3 className={className} aria-hidden="true" />;
  if (status === 'running') return <LoaderCircle className={cn(className, 'animate-spin')} aria-hidden="true" />;
  if (status === 'completed') return <Check className={className} aria-hidden="true" />;
  if (status === 'failed') return <X className={className} aria-hidden="true" />;
  return <Minus className={className} aria-hidden="true" />;
}

/** Text + icon, never colour alone (UX §8.1). */
export function StatusChip({
  status,
  className,
}: {
  status: FieldStatus | JobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        TONE[status],
        className,
      )}
      data-testid={`status-${status}`}
    >
      <Icon status={status} />
      {COPY[status]}
    </span>
  );
}
