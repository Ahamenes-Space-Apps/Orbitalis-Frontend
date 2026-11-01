import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabel?: string };

export function Slider({ className, thumbLabel, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-6 w-full touch-none items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#1a2338]">
        <SliderPrimitive.Range className="absolute h-full bg-amber" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className="block size-5 rounded-full border-2 border-amber bg-field shadow"
      />
    </SliderPrimitive.Root>
  );
}
