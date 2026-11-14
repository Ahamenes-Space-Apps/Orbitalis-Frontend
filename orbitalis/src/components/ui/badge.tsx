import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center px-3 py-1 text-[13px]', {
  variants: {
    tone: {
      neutral: 'border-line-2 text-mist',
      accent: 'border-accent bg-accent/12 font-semibold text-accent',
      secondary: 'border-accent-2 bg-accent-2/12 font-semibold text-accent-2',
      quiet: 'border-line text-haze',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
