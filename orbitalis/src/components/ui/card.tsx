import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-sm border border-line bg-panel p-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('m-0 text-[13px] font-semibold tracking-[0.01em] text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 mt-1 text-[11px] leading-relaxed text-haze', className)} {...props} />;
}
