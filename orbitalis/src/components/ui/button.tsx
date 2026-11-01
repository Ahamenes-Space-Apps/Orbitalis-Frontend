import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-amber text-[#1a1204] hover:bg-amber-soft',
        outline: 'border border-[#3a4666] text-ink hover:bg-panel-2',
        ghost: 'text-mist hover:bg-panel-2 hover:text-ink',
        pill: 'rounded-full border border-line-2 bg-bar/90 text-mist hover:text-ink data-[active=true]:border-amber data-[active=true]:bg-amber/12 data-[active=true]:text-amber',
        segment:
          'rounded-none bg-transparent text-haze hover:text-ink data-[active=true]:bg-[#1b2540] data-[active=true]:text-ink',
      },
      size: {
        default: 'min-h-11 px-5 text-sm',
        sm: 'min-h-9 px-3 text-[13px]',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
