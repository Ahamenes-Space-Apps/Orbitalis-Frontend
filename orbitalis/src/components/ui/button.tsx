import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-[color,background-color,border-color,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
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
