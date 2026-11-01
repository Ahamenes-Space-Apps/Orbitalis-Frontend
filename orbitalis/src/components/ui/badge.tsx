import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full border px-3 py-1 text-[13px]', {
  variants: {
    tone: {
      neutral: 'border-[#3a4666] text-[#cbd3e4]',
      amber: 'border-amber bg-amber/12 font-semibold text-amber',
      violet: 'border-violet bg-violet/12 font-semibold text-violet',
      teal: 'border-teal/60 text-teal',
      quiet: 'border-line-2 text-haze',
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
