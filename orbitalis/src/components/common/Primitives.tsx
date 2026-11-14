import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[#17223a]', className)}
    />
  );
}

export function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-3', className)}>
      <p className="m-0 text-sm text-haze">{label}</p>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-line bg-panel px-4 py-3', className)}>
      <div className="text-[11px] tracking-widest text-haze uppercase">{label}</div>
      <div className="mt-1 font-mono text-xl leading-tight text-ink">{value}</div>
      {hint && <div className="mt-1 text-[12px] leading-snug text-mist">{hint}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow && <div className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">{eyebrow}</div>}
      <h1 className="m-0 text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="m-0 max-w-3xl text-[14px] leading-relaxed text-mist">{description}</p>}
    </div>
  );
}
