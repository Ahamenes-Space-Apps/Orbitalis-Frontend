import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[12px] font-medium transition-[color,background-color,border-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-accent text-field hover:bg-accent-soft',
        outline: 'border border-line-2 text-ink hover:bg-panel-2',
        ghost: 'text-mist hover:bg-panel-2 hover:text-ink',
        pill: 'rounded-full border border-line-2 bg-bar/90 text-mist hover:text-ink data-[active=true]:border-accent data-[active=true]:bg-accent/12 data-[active=true]:text-accent',
        segment:
          'rounded-none bg-transparent text-haze hover:text-ink data-[active=true]:bg-panel-2 data-[active=true]:text-ink',
      },
      size: {
        default: 'min-h-9 px-3.5',
        sm: 'min-h-8 px-2.5 text-[11px]',
        icon: 'size-9',
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
