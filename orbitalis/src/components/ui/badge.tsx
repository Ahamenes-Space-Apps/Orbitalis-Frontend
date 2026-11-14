import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em]',
  {
    variants: {
      tone: {
        neutral: 'text-haze',
        amber: 'text-accent',
        violet: 'text-signal',
        teal: 'text-accent',
        quiet: 'text-haze',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
