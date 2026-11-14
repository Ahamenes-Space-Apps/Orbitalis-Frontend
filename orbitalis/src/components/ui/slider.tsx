import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabel?: string };

export function Slider({ className, thumbLabel, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-5 w-full touch-none items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-px w-full grow overflow-hidden bg-line-2">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className="block size-3 rounded-none border border-accent bg-canvas"
      />
    </SliderPrimitive.Root>
  );
}
